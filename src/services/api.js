// src/services/api.js

import { supabase } from '../config/supabaseClient'; 

// --- Families ---

export async function fetchUserFamilies(profileId, userEmail) {
    // 1. Fetch Owned
    const { data: owned, error: ownedError } = await supabase
        .from('families')
        .select('*')
        .eq('owner_id', profileId);

    // 2. Fetch Shared
    const { data: sharedEntries, error: sharedError } = await supabase
        .from('family_shares')
        .select(`families (*)`)
        .eq('shared_with_email', userEmail.toLowerCase().trim());

    // FIX: Ensure both variables are checked correctly
    if (ownedError || sharedError) {
        console.error("Fetch Error:", ownedError || sharedError);
        return { families: [], error: ownedError || sharedError };
    }

    const sharedFamilies = sharedEntries 
        ? sharedEntries.map(entry => entry.families).filter(f => f !== null) 
        : [];

    const allFamilies = [...(owned || []), ...sharedFamilies];
    const uniqueFamilies = Array.from(new Map(allFamilies.map(f => [f.id, f])).values());

    return { families: uniqueFamilies, error: null };
}

export async function shareFamilyTree(familyId, email) {
    const { data, error } = await supabase
        .from('family_shares')
        .insert([
            { 
                family_id: familyId, 
                shared_with_email: email.toLowerCase().trim(), 
                permission_level: 'view' 
            }
        ]);
    return { data, error };
}

export async function createNewFamilyTree(name, profileId) {
    const { data, error } = await supabase
        .from('families')
        .insert([{ name: name, owner_id: profileId }])
        .select() 
        .single(); 
    return { family: data, error };
}


export async function renameFamilyTree(familyId, newName) {
    const { data, error } = await supabase
        .from('families')
        .update({ name: newName })
        .eq('id', familyId)
        .select()
        .single();

    return { data, error };
}

// --- People and Relationships ---

export async function fetchPeopleByFamily(familyId) {
    // We use !inner to join people -> family_members -> check family_id
    const { data: people, error } = await supabase
        .from('people')
        .select(`
            *, 
            family_members!inner(family_id)
        `)
        .eq('family_members.family_id', familyId);
        
    return { people: people || [], error };
}

export async function createPerson(personData, familyId) {
    const { data: newPerson, error: personError } = await supabase
        .from('people')
        .insert([personData])
        .select()
        .single();

    if (personError) return { person: null, error: personError };
    
    const { error: linkError } = await supabase
        .from('family_members')
        .insert([{ family_id: familyId, person_id: newPerson.id }]);

    return { person: newPerson, error: linkError };
}

// NOTE: You will need to add relationship functions (createRelationship, etc.) later.

// --- Storage ---

/**
 * Uploads a file to Backblaze B2 (or assumed B2 endpoint)
 * This function assumes you have a pre-signed, publicly accessible B2 endpoint 
 * or are uploading to a simple public/CORS-enabled B2 bucket endpoint.
 * * @param {File} file - The file object to upload.
 * @param {string} familyId - The ID of the family (used for folder path).
 * @param {string} personId - The ID of the person (used for folder path and filename).
 * @returns {{path: string|null, error: Error|null}} The unique public URL for the image.
 */

// --- B2 Configuration (Global Scope) ---
// The URL of your local authorization server
const AUTH_ENDPOINT = 'http://localhost:3000/api/b2-auth'; 
// The final public download base URL (replace with your actual URL)
const B2_PUBLIC_BASE_URL = 'https://f003.backblazeb2.com/file/FamilyRootsImages'; 
// ----
async function getB2UploadUrl() {
    const response = await fetch(AUTH_ENDPOINT);
    if (!response.ok) {
        // CRITICAL FIX: The error is here!
        throw new Error('Failed to get B2 upload authorization from backend.');
    }
    return response.json();
}

// NEW: Helper function to trigger the save after widget success
export async function saveProfilePictureUrl(personId, url) {
    const personData = { profile_picture_url: url };
    return updatePerson(personId, personData);
}

export async function uploadProfilePicture(file, familyId, personId) {
    if (!file) return { path: null, error: null };

    try {
        // Step 1: Get Authorization and Upload URL from secure backend
        const { uploadUrl, authorizationToken } = await getB2UploadUrl(); 

        // Step 2: Prepare B2 file path and final URL
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const storagePath = `${familyId}/${personId}/${fileName}`;
        const finalPublicUrl = `${B2_PUBLIC_BASE_URL}/${storagePath}`;

        // Step 3: Perform the direct upload to B2 (using the authorized URL and token)
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': authorizationToken,
                'X-Bz-File-Name': storagePath, // B2 requires the full path here
                'Content-Type': file.type || 'application/octet-stream',
                'Content-Length': file.size.toString(),
            },
            body: file,
        });

        if (!response.ok) {
            console.error('B2 Upload Failed:', await response.text());
            return { path: null, error: new Error('Image upload failed during transfer.') };
        }

        // Return the full public URL path to be saved in the database
        return { path: finalPublicUrl, error: null };

    } catch (e) {
        console.error("B2 Authorization or Upload Error:", e);
        return { path: null, error: e };
    }
}

export const updatePerson = async (id, updates) => {
    const { data, error } = await supabase
        .from('people')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    return { person: data, error };
};

/**
 * Inserts multiple relationship records in a single batch operation.
 * @param {Array} relationshipsArray - Array of {family_id, person_a_id, person_b_id, type} objects.
 */

export async function createRelationships(relationshipsArray) {
    if (!relationshipsArray || relationshipsArray.length === 0) {
        return { data: null, error: null };
    }

    const { data, error } = await supabase
        .from('relationships')
        .insert(relationshipsArray) // Inserts the array payload
        .select();

    if (error) {
        console.error('Supabase Error (createRelationships):', error);
        return { data: null, error };
    }
    return { data, error: null };
}

export async function deleteFamilyTree(familyId) {
    const { error } = await supabase
        .from('families')
        .delete()
        .eq('id', familyId);

    return { success: !error, error };
}

export async function deletePerson(personId) {
    // NOTE: This assumes CASCADE DELETE is enabled in your database schema 
    // for family_members and relationships referencing people(id).
    
    // If CASCADE is NOT set, you must manually delete relationships and family_members first.
    
    const { error: personError } = await supabase
        .from('people')
        .delete()
        .eq('id', personId);

    return { success: !personError, error: personError };
}


/**
 * Fetches all relationships for a specific person within a family.
 */
export async function fetchRelationshipsByPerson(familyId) {
    if (!familyId) {
        console.warn("Attempted to fetch relationships without a Family ID.");
        return { relationships: [], error: null };
    }

    const { data: relationships, error } = await supabase
        .from('relationships')
        .select(`
            id, 
            type,
            person_a_id,
            person_b_id,
            person_a:person_a_id(id, first_name, last_name),
            person_b:person_b_id(id, first_name, last_name)
        `) // Added person_a_id and person_b_id to the selection
        .eq('family_id', familyId);
        
    return { relationships: relationships || [], error };
}

/**
 * Deletes a relationship entry.
 */
export async function deleteRelationship(relationshipId) {
    const { error } = await supabase
        .from('relationships')
        .delete()
        .eq('id', relationshipId);

    return { success: !error, error };
}


export async function fetchAllPeopleBasic(familyId) {
    const { data: people, error } = await supabase
        .from('people')
        .select(`
            id, first_name, last_name,
            family_members!inner(family_id) 
        `)
        .eq('family_members.family_id', familyId);
        
    return { people, error };
}


// src/services/api.js (Add this NEW function)

/**
 * Performs a batch update to save the position of multiple nodes.
 * @param {Array} positionUpdates - Array of objects: [{ id: personId, position_data: {x, y} }]
 */
export async function saveNodePositions(positionUpdates) {
    let globalError = null;

    // FIX: Filter out junction nodes. They don't exist in the 'people' table.
    const validUpdates = positionUpdates.filter(update => !update.id.toString().startsWith('junc-'));

    const updatePromises = validUpdates.map(update => {
        return supabase
            .from('people')
            .update({ position_data: update.position_data })
            .eq('id', update.id)
            .then(({ error }) => {
                if (error) {
                    console.error(`Failed to update position for ${update.id}:`, error);
                    globalError = globalError || error;
                }
            });
    });

    await Promise.all(updatePromises);
    return { error: globalError };
}