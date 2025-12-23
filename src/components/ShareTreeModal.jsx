// Inside ShareTreeModal.jsx
const [email, setEmail] = useState('');
const [role, setRole] = useState('viewonly'); // Default selection

const handleShare = async () => {
    const { error } = await supabase
        .from('tree_permissions')
        .upsert({ 
            tree_id: familyId, 
            user_email: email.toLowerCase().trim(), 
            role: role // This will be 'viewonly', 'edit', or 'full'
        });

    if (error) alert(error.message);
    else alert(`Shared successfully as ${role}!`);
};

return (
    <div className="share-modal">
        <h3>Share Tree</h3>
        <input 
            type="email" 
            placeholder="Recipient's Gmail" 
            onChange={(e) => setEmail(e.target.value)} 
        />
        
        <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="viewonly">View Only (Canvas locked)</option>
            <option value="edit">Editor (Can change info, cannot move nodes)</option>
            <option value="full">Full Access (All controls)</option>
        </select>

        <button onClick={handleShare}>Send Invite</button>
    </div>
);