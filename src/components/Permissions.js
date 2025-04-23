import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateEmail } from 'firebase/auth';

function Permissions() {
  const [permissions, setPermissions] = useState({});
  const [showPopup, setShowPopup] = useState(false);
  const [showEditPopup, setShowEditPopup] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserType, setNewUserType] = useState('Admin');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserNewEmail, setEditUserNewEmail] = useState('');

  const columns = [
    'HR People',
    'HR Vacation Shifts',
    'Training OnEquity',
    'Training Exnie',
    'Training B2Hive',
    'Training FundsCap',
    'Training Video',
    'Training Onboarding',
    'Finance',
    'APP ON AI',
    'APP ON IC',
    'APP ON Termination',
    'APP ON CC',
    'APP ON Templates',
    'APP ON HTML',
    'APP ON TP',
    'APP ON LP',
    'APP EX OM',
    'APP EX TA',
    'APP EX Templates',
    'APP HTML',
  ];

  const columnTitles = {
    'HR People': 'Human Resources: People',
    'HR Vacation Shifts': 'Human Resources: Vacation Shifts',
    'Training OnEquity': 'Training: OnEquity',
    'Training Exnie': 'Training: Exnie',
    'Training B2Hive': 'Training: B2Hive',
    'Training FundsCap': 'Training: FundsCap',
    'Training Video': 'Training: Video',
    'Training Onboarding': 'Training: Onboarding',
    'Finance': 'Finance',
    'APP ON AI': 'Apps OnEquity: A.I. Support',
    'APP ON IC': 'Apps OnEquity: Internal Control',
    'APP ON Termination': 'Apps OnEquity: Termination',
    'APP ON CC': 'Apps OnEquity: Clients Complaints',
    'APP ON Templates': 'Apps OnEquity: Templates',
    'APP ON HTML': 'Apps OnEquity: Templates HTML',
    'APP ON TP': 'Apps OnEquity: TrustPilot',
    'APP ON LP': 'Apps OnEquity: Lots and Profits',
    'APP EX OM': 'Apps Exnie: Order Management',
    'APP EX TA': 'Apps Exnie: Trading Analysis',
    'APP EX Templates': 'Apps Exnie: Templates',
    'APP HTML': 'Apps Exnie: Templates HTML',
  };

  // Função para gerar senha aleatória e segura
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Carregar permissões do Firestore
  useEffect(() => {
    const fetchPermissions = async () => {
      const permissionsSnapshot = await getDocs(collection(db, 'permissions'));
      const permissionsData = {};
      permissionsSnapshot.forEach((doc) => {
        permissionsData[doc.id] = doc.data();
      });
      setPermissions(permissionsData);
    };
    fetchPermissions();
  }, []);

  const togglePermission = (email, key) => {
    setPermissions((prev) => ({
      ...prev,
      [email]: {
        ...prev[email],
        [key]: !prev[email][key],
      },
    }));
  };

  const toggleAll = () => {
    const allChecked = Object.values(permissions).every((userPermissions) =>
      columns.every((col) => userPermissions[col.toLowerCase().replace(/ /g, '_')])
    );
    const newPermissions = {};
    Object.keys(permissions).forEach((email) => {
      newPermissions[email] = { ...permissions[email] };
      columns.forEach((col) => {
        newPermissions[email][col.toLowerCase().replace(/ /g, '_')] = !allChecked;
      });
    });
    setPermissions(newPermissions);
  };

  const toggleColumn = (columnKey) => {
    const allChecked = Object.values(permissions).every(
      (userPermissions) => userPermissions[columnKey]
    );
    const newPermissions = {};
    Object.keys(permissions).forEach((email) => {
      newPermissions[email] = {
        ...permissions[email],
        [columnKey]: !allChecked,
      };
    });
    setPermissions(newPermissions);
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserName) {
      alert('Please enter an email and name.');
      return;
    }

    const password = generatePassword();
    setGeneratedPassword(password);

    try {
      // Cadastrar usuário no Firebase Auth
      await createUserWithEmailAndPassword(auth, newUserEmail, password);

      // Definir permissões iniciais (Admin ou User)
      const initialPermissions = {
        name: newUserName,
        frozen: false,
      };
      columns.forEach((col) => {
        initialPermissions[col.toLowerCase().replace(/ /g, '_')] =
          newUserType === 'Admin'; // Admin tem todas as permissões por padrão
      });

      // Salvar permissões no Firestore
      await setDoc(doc(db, 'permissions', newUserEmail), initialPermissions);

      // Atualizar estado local
      setPermissions((prev) => ({
        ...prev,
        [newUserEmail]: initialPermissions,
      }));

      // Copiar credenciais para a área de transferência
      const credentials = `Login: ${newUserEmail}\nPassword: ${password}`;
      navigator.clipboard.writeText(credentials);
      alert(`User added successfully! Credentials copied to clipboard:\n${credentials}`);

      // Fechar popup
      setShowPopup(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserType('Admin');
    } catch (error) {
      alert(`Error adding user: ${error.message}`);
    }
  };

  const handleUpdatePermissions = async () => {
    try {
      for (const email of Object.keys(permissions)) {
        const userPermissions = permissions[email];
        await setDoc(doc(db, 'permissions', email), userPermissions);
      }
      alert('Permissions updated successfully!');
    } catch (error) {
      alert(`Error updating permissions: ${error.message}`);
    }
  };

  const handleDeleteUser = async (email) => {
    if (window.confirm(`Are you sure you want to delete ${email}?`)) {
      try {
        await deleteDoc(doc(db, 'permissions', email));
        setPermissions((prev) => {
          const newPermissions = { ...prev };
          delete newPermissions[email];
          return newPermissions;
        });
        alert('User deleted successfully!');
      } catch (error) {
        alert(`Error deleting user: ${error.message}`);
      }
    }
  };

  const handleEditUser = (email) => {
    setEditUserEmail(email);
    setEditUserNewEmail(email);
    setShowEditPopup(true);
  };

  const handleSaveEdit = async () => {
    if (!editUserNewEmail) {
      alert('Please enter a new email.');
      return;
    }

    try {
      // Atualizar e-mail no Firebase Auth
      const currentUser = auth.currentUser;
      if (currentUser.email === editUserEmail) {
        await updateEmail(currentUser, editUserNewEmail);
      }

      // Atualizar permissões no Firestore
      const userPermissions = permissions[editUserEmail];
      await setDoc(doc(db, 'permissions', editUserNewEmail), userPermissions);
      await deleteDoc(doc(db, 'permissions', editUserEmail));

      // Atualizar estado local
      setPermissions((prev) => {
        const newPermissions = { ...prev };
        newPermissions[editUserNewEmail] = userPermissions;
        delete newPermissions[editUserEmail];
        return newPermissions;
      });

      // Fechar popup
      setShowEditPopup(false);
      setEditUserEmail('');
      setEditUserNewEmail('');
      alert('User email updated successfully!');
    } catch (error) {
      alert(`Error updating user email: ${error.message}`);
    }
  };

  const handleFreezeUser = async (email) => {
    const newFrozenState = !permissions[email].frozen;
    try {
      await updateDoc(doc(db, 'permissions', email), { frozen: newFrozenState });
      setPermissions((prev) => ({
        ...prev,
        [email]: {
          ...prev[email],
          frozen: newFrozenState,
        },
      }));
      alert(`User ${newFrozenState ? 'frozen' : 'unfrozen'} successfully!`);
    } catch (error) {
      alert(`Error updating user status: ${error.message}`);
    }
  };

  return (
    <div className="content-container">
      <h2>Permissions</h2>
      <button
        onClick={() => setShowPopup(true)}
        style={{
          marginBottom: '20px',
          padding: '10px 20px',
          background: '#2c3e50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Add User
      </button>
      <button
        onClick={handleUpdatePermissions}
        style={{
          marginBottom: '20px',
          marginLeft: '10px',
          padding: '10px 20px',
          background: '#2c3e50',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Update Permissions
      </button>
      {showPopup && (
        <div className="popup">
          <div className="popup-content">
            <h3>Add New User</h3>
            <label>
              Type
              <select
                value={newUserType}
                onChange={(e) => setNewUserType(e.target.value)}
              >
                <option value="Admin">Admin</option>
                <option value="User">User</option>
              </select>
            </label>
            <label>
              Name
              <input
                type="text"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="text"
                value={generatedPassword || 'Will be generated'}
                readOnly
              />
            </label>
            <div className="buttons">
              <button onClick={handleAddUser}>Save</button>
              <button onClick={() => setShowPopup(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {showEditPopup && (
        <div className="popup">
          <div className="popup-content">
            <h3>Edit User</h3>
            <label>
              Email
              <input
                type="email"
                value={editUserNewEmail}
                onChange={(e) => setEditUserNewEmail(e.target.value)}
              />
            </label>
            <div className="buttons">
              <button onClick={handleSaveEdit}>Save</button>
              <button onClick={() => setShowEditPopup(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      <div className="permissions-table-container">
        <table className="permissions-table">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  onChange={toggleAll}
                  checked={Object.values(permissions).every((userPermissions) =>
                    columns.every((col) => userPermissions[col.toLowerCase().replace(/ /g, '_')])
                  )}
                />
                User
              </th>
              {columns.map((col) => (
                <th key={col} title={columnTitles[col]}>
                  <input
                    type="checkbox"
                    onChange={() => toggleColumn(col.toLowerCase().replace(/ /g, '_'))}
                    checked={Object.values(permissions).every(
                      (userPermissions) => userPermissions[col.toLowerCase().replace(/ /g, '_')]
                    )}
                  />
                  {col}
                </th>
              ))}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.keys(permissions).map((email) => (
              <tr key={email}>
                <td title={permissions[email].name}>{email}</td>
                {columns.map((col) => {
                  const key = col.toLowerCase().replace(/ /g, '_');
                  return (
                    <td key={`${email}-${col}`}>
                      <input
                        type="checkbox"
                        checked={permissions[email][key]}
                        onChange={() => togglePermission(email, key)}
                      />
                    </td>
                  );
                })}
                <td>
                  <i
                    className="fas fa-trash-alt action-icon"
                    onClick={() => handleDeleteUser(email)}
                    title="Delete"
                  ></i>
                  <i
                    className="fas fa-edit action-icon"
                    onClick={() => handleEditUser(email)}
                    title="Edit"
                  ></i>
                  <i
                    className="fas fa-snowflake action-icon"
                    onClick={() => handleFreezeUser(email)}
                    style={{
                      color: permissions[email].frozen ? '#a3bffa' : '#7f8c8d',
                    }}
                    title={permissions[email].frozen ? 'Unfreeze' : 'Freeze'}
                  ></i>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Permissions;