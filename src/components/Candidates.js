import React, { useState, useEffect, useCallback, useRef } from 'react';
import emailjs from '@emailjs/browser';
import { db } from '../firebase/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../App.css';

function Candidates({ addNotification }) {
  const [candidates, setCandidates] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState(() => {
    const savedState = sessionStorage.getItem('expandedGroups');
    return savedState ? JSON.parse(savedState) : {
      Interview: true,
      Candidates: false,
      Declined: false,
    };
  });
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [iconStates, setIconStates] = useState({});
  const [photoError, setPhotoError] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [newSlot, setNewSlot] = useState({ date: '', time: '', duration: '30', type: 'online' });
  const [editingSlot, setEditingSlot] = useState(null);
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [dataInitialized, setDataInitialized] = useState(false);

  const sidebarRef = useRef(null);

  useEffect(() => {
    sessionStorage.setItem('expandedGroups', JSON.stringify(expandedGroups));
  }, [expandedGroups]);

  useEffect(() => {
    return () => {
      sessionStorage.removeItem('expandedGroups');
    };
  }, []);

  useEffect(() => {
    if (dataInitialized) return;

    const fetchCandidates = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'candidates'));
        const candidatesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        console.log('Candidates fetched:', candidatesList);
        return candidatesList.sort((a, b) => new Date(a.registrationDate) - new Date(b.registrationDate));
      } catch (error) {
        console.error('Error fetching candidates:', error);
        return [];
      }
    };

    const fetchSlots = async () => {
      try {
        const slotsSnapshot = await getDocs(collection(db, 'interviewSlots'));
        const slotsList = slotsSnapshot.docs.map((doc) => doc.data());
        console.log('Available slots fetched:', slotsList);

        const interviewsSnapshot = await getDocs(collection(db, 'scheduledInterviews'));
        const interviewsList = interviewsSnapshot.docs.map((doc) => doc.data());

        const available = slotsList.filter(slot => 
          !interviewsList.some(interview => 
            interview.start === slot.start && interview.end === slot.end && interview.type === slot.type
          )
        );
        setAvailableSlots(available);
      } catch (error) {
        console.error('Error fetching interview slots:', error);
      }
    };

    const fetchScheduledInterviews = async (candidatesList) => {
      try {
        const interviewsSnapshot = await getDocs(collection(db, 'scheduledInterviews'));
        const interviewsList = interviewsSnapshot.docs.map((doc) => doc.data());
        setScheduledInterviews(interviewsList);

        const updatedCandidates = await Promise.all(candidatesList.map(async (candidate) => {
          const scheduledRef = doc(db, 'scheduledInterviews', candidate.id);
          const scheduledDoc = await getDoc(scheduledRef);
          if (scheduledDoc.exists()) {
            const interviewData = scheduledDoc.data();
            return {
              ...candidate,
              interviewDate: interviewData.start,
              interviewLink: interviewData.link || candidate.interviewLink,
            };
          }
          return candidate;
        }));
        console.log('Updated candidates with scheduled interviews:', updatedCandidates);
        setCandidates(updatedCandidates);
      } catch (error) {
        console.error('Error fetching scheduled interviews:', error);
      }
    };

    const fetchValidatedEmails = async () => {
      try {
        const validatedSnapshot = await getDocs(collection(db, 'validatedEmails'));
        const validatedList = validatedSnapshot.docs.map((doc) => doc.id);
        console.log('Validated emails fetched:', validatedList);
      } catch (error) {
        console.error('Error fetching validated emails:', error);
      }
    };

    const initializeData = async () => {
      const candidatesList = await fetchCandidates();
      await fetchSlots();
      await fetchValidatedEmails();
      await fetchScheduledInterviews(candidatesList);
      setDataInitialized(true);
    };

    initializeData();
  }, [dataInitialized]);

  const handleEscKey = useCallback((event) => {
    if (event.key === 'Escape' && calendarOpen) {
      setCalendarOpen(false);
      setEditingSlot(null);
      setNewSlot({ date: '', time: '', duration: '30', type: 'online' });
    }
  }, [calendarOpen]);

  useEffect(() => {
    document.addEventListener('keydown', handleEscKey);
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [handleEscKey]);

  const groupedCandidates = {
    Interview: candidates
      .filter((c) => c.status === 'Interview')
      .sort((a, b) => {
        const dateA = a.interviewDate ? new Date(a.interviewDate) : new Date(0);
        const dateB = b.interviewDate ? new Date(b.interviewDate) : new Date(0);
        return dateA - dateB;
      }),
    Candidates: candidates.filter((c) => c.status === 'Candidates' || c.status === 'On Hold'),
    Declined: candidates.filter((c) => c.status === 'Declined'),
  };

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return 'N/A';
    const birth = new Date(birthDate);
    const currentDate = new Date('2025-04-21');
    const ageInYears = currentDate.getFullYear() - birth.getFullYear();
    const monthDiff = currentDate.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && currentDate.getDate() < birth.getDate())) {
      return ageInYears - 1;
    }
    return ageInYears;
  };

  const handleViewCV = (cvUrl, event) => {
    event.stopPropagation();
    if (cvUrl && cvUrl.startsWith('https://')) {
      window.open(cvUrl, '_blank');
    } else {
      alert('CV not available or invalid. Please upload the CV again.');
    }
  };

  const handleDecline = async (candidateId, event) => {
    event.stopPropagation();
    try {
      const candidateRef = doc(db, 'candidates', candidateId);
      const candidate = candidates.find(c => c.id === candidateId);
      if (!candidate || !candidate.email) {
        throw new Error('Candidate email not found.');
      }
      await updateDoc(candidateRef, { status: 'Declined' });
      setCandidates(candidates.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, status: 'Declined' } : candidate
      ));
      setIconStates((prev) => ({
        ...prev,
        [`${candidateId}-decline`]: true,
        [`${candidateId}-hold`]: false,
        [`${candidateId}-interview`]: false,
      }));
      addNotification('Candidate declined successfully.');

      console.log('Sending decline email with params:', {
        name: candidate.fullName,
        email: candidate.email,
      });
      await emailjs.send('service_m0ua4ne', 'template_hir6lic', {
        name: candidate.fullName,
        email: candidate.email,
      }, 'NwAZALUxD9KnVgaOI');
    } catch (error) {
      console.error('Error declining candidate:', error);
      alert('Error declining candidate: ' + error.message);
    }
  };

  const handleHold = async (candidateId, event) => {
    event.stopPropagation();
    try {
      const candidateRef = doc(db, 'candidates', candidateId);
      const newStatus = candidates.find(c => c.id === candidateId).status === 'On Hold' ? 'Candidates' : 'On Hold';
      await updateDoc(candidateRef, { status: newStatus });
      setCandidates(candidates.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, status: newStatus } : candidate
      ));
      setIconStates((prev) => ({
        ...prev,
        [`${candidateId}-hold`]: newStatus === 'On Hold',
        [`${candidateId}-decline`]: false,
        [`${candidateId}-interview`]: false,
      }));
      addNotification(newStatus === 'On Hold' ? 'Candidate placed on hold.' : 'Candidate removed from hold.');
    } catch (error) {
      console.error('Error placing candidate on hold:', error);
      alert('Error placing candidate on hold. Please try again.');
    }
  };

  const handleInterview = async (candidateId, event) => {
    event.stopPropagation();
    try {
      const candidateRef = doc(db, 'candidates', candidateId);
      await updateDoc(candidateRef, { status: 'Interview' });
      setCandidates(candidates.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, status: 'Interview' } : candidate
      ));
      setIconStates((prev) => ({
        ...prev,
        [`${candidateId}-interview`]: true,
        [`${candidateId}-decline`]: false,
        [`${candidateId}-hold`]: false,
      }));
      addNotification('Candidate moved to interview.');
    } catch (error) {
      console.error('Error moving candidate to interview:', error);
      alert('Error moving candidate to interview. Please try again.');
    }
  };

  const handleRestore = async (candidateId, event) => {
    event.stopPropagation();
    try {
      const candidateRef = doc(db, 'candidates', candidateId);
      await updateDoc(candidateRef, { status: 'Interview' });
      setCandidates(candidates.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, status: 'Interview' } : candidate
      ));
      setIconStates((prev) => ({
        ...prev,
        [`${candidateId}-decline`]: false,
        [`${candidateId}-hold`]: false,
        [`${candidateId}-interview`]: true,
      }));
      addNotification('Candidate restored to Interview group.');
    } catch (error) {
      console.error('Error restoring candidate:', error);
      alert('Error restoring candidate. Please try again.');
    }
  };

  const handleApprove = async (candidateId, event) => {
    event.stopPropagation();
    try {
      const candidate = candidates.find(c => c.id === candidateId);
      const employeeData = {
        fullName: candidate.fullName,
        email: candidate.email,
        birthDate: candidate.birthDate,
        contact: candidate.contact,
        cep: candidate.cep,
        street: candidate.street,
        number: candidate.number,
        complement: candidate.complement,
        neighborhood: candidate.neighborhood,
        city: candidate.city,
        familyStructure: candidate.familyStructure,
        education: candidate.education,
        status: 'Hiring',
        createdAt: new Date().toISOString(),
      };
      await setDoc(doc(db, 'employees', candidateId), employeeData);
      await deleteDoc(doc(db, 'candidates', candidateId));
      setCandidates(candidates.filter((c) => c.id !== candidateId));
      addNotification('Candidate approved and moved to Hiring.');
    } catch (error) {
      console.error('Error approving candidate:', error);
      alert('Error approving candidate. Please try again.');
    }
  };

  const handleRowClick = (candidate) => {
    console.log('Row clicked, candidate:', candidate);
    setSelectedCandidate(candidate);
    setPhotoError(false);
    console.log('Photo URL when opening popup:', candidate.photo);
    console.log('Selected candidate set to:', candidate);
  };

  const closePopup = () => {
    console.log('Closing popup');
    setSelectedCandidate(null);
    setPhotoError(false);
  };

  const handleOpenSidebar = () => {
    console.log('Opening sidebar, setting calendarOpen to true');
    setCalendarOpen(true);
  };

  const sendOnlineInterviewEmail = async () => {
    if (!selectedCandidate) {
      alert('No candidate selected.');
      return;
    }
    if (!selectedCandidate.email) {
      alert('Candidate email not found.');
      return;
    }
    try {
      const calendarLink = `https://fmxentrevistas.netlify.app/?id=${selectedCandidate.id}&type=online`;
      console.log('Sending online interview email with params:', {
        name: selectedCandidate.fullName,
        email: selectedCandidate.email,
        calendar_link: calendarLink,
      });
      await emailjs.send('service_bx0nnyj', 'template_u8x94wb', {
        name: selectedCandidate.fullName,
        email: selectedCandidate.email,
        calendar_link: calendarLink,
      }, '3OiiNuj_D8ap9r4PU');
      addNotification('Online interview email sent successfully.');
    } catch (error) {
      console.error('Error sending online interview email:', error);
      alert('Error sending online interview email: ' + error.message);
    }
  };

  const copyInterviewLink = () => {
    if (!selectedCandidate || !selectedCandidate.interviewLink) {
      alert('No interview link available to copy.');
      return;
    }
    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(selectedCandidate.interviewLink).then(() => {
        addNotification('Interview link copied to clipboard.');
      }).catch((err) => {
        console.error('Failed to copy interview link:', err);
        alert('Failed to copy interview link. Please copy it manually.');
      });
    } else {
      alert('Clipboard API is not supported in this environment.');
    }
  };

  const sendInPersonInterviewEmail = async () => {
    if (!selectedCandidate) {
      alert('No candidate selected.');
      return;
    }
    if (!selectedCandidate.email) {
      alert('Candidate email not found.');
      return;
    }
    try {
      const calendarLink = `https://fmxentrevistas.netlify.app/?id=${selectedCandidate.id}&type=inperson`;
      console.log('Sending in-person interview email with params:', {
        name: selectedCandidate.fullName,
        email: selectedCandidate.email,
        calendar_link: calendarLink,
      });
      await emailjs.send('service_bx0nnyj', 'template_3z29lrw', {
        name: selectedCandidate.fullName,
        email: selectedCandidate.email,
        calendar_link: calendarLink,
      }, '3OiiNuj_D8ap9r4PU');
      addNotification('In-person interview email sent successfully.');
    } catch (error) {
      console.error('Error sending in-person interview email:', error);
      alert('Error sending in-person interview email: ' + error.message);
    }
  };

  const handleAddSlot = async () => {
    if (!newSlot.date || !newSlot.time || !newSlot.duration) {
      addNotification('Please fill in all fields (date, time, and duration).');
      return;
    }

    const startDateTime = new Date(`${newSlot.date}T${newSlot.time}`);
    const endDateTime = new Date(startDateTime.getTime() + parseInt(newSlot.duration) * 60000);

    const slot = {
      start: startDateTime.toISOString(),
      end: endDateTime.toISOString(),
      type: newSlot.type,
    };

    try {
      if (editingSlot) {
        await setDoc(doc(db, 'interviewSlots', `${editingSlot.start}_${editingSlot.type}`), slot);
        setAvailableSlots(availableSlots.map(s => 
          s.start === editingSlot.start && s.type === editingSlot.type ? slot : s
        ));
        addNotification('Interview slot updated successfully.');
      } else {
        await setDoc(doc(db, 'interviewSlots', `${slot.start}_${slot.type}`), slot);
        setAvailableSlots([...availableSlots, slot]);
        addNotification('Interview slot added successfully.');
      }
      setNewSlot({ date: '', time: '', duration: '30', type: 'online' });
      setEditingSlot(null);
    } catch (error) {
      console.error('Error adding/updating interview slot:', error);
      addNotification('Error adding/updating interview slot. Please try again.');
    }
  };

  const handleEditSlot = (slot) => {
    const startDateTime = new Date(slot.start);
    setNewSlot({
      date: startDateTime.toISOString().split('T')[0],
      time: startDateTime.toTimeString().slice(0, 5),
      duration: ((new Date(slot.end) - new Date(slot.start)) / 60000).toString(),
      type: slot.type,
    });
    setEditingSlot(slot);
  };

  const handleDeleteSlot = async (slot) => {
    try {
      await deleteDoc(doc(db, 'interviewSlots', `${slot.start}_${slot.type}`));
      setAvailableSlots(availableSlots.filter(s => 
        s.start !== slot.start || s.type !== slot.type
      ));
      addNotification('Interview slot deleted successfully.');
    } catch (error) {
      console.error('Error deleting interview slot:', error);
      addNotification('Error deleting interview slot. Please try again.');
    }
  };

  return (
    <div className="candidates-container">
      <div className="header-actions">
        <button className="add-employee-icon" onClick={handleOpenSidebar} title="Schedule Interviews">
          <i className="fas fa-calendar-alt"></i>
        </button>
      </div>
      <div className="candidates-table-wrapper">
        <div className="permissions-table-container">
          {['Interview', 'Candidates', 'Declined'].map((group) => (
            <div key={group} className="status-group">
              <div className="group-header" onClick={() => toggleGroup(group)}>
                <h3>{group} {groupedCandidates[group].length}</h3>
                <i className={`fas fa-chevron-${expandedGroups[group] ? 'up' : 'down'}`}></i>
              </div>
              {expandedGroups[group] && (
                <div className="table-scroll-wrapper">
                  <table className={`permissions-table ${group.toLowerCase()}-table`} style={{ tableLayout: 'fixed', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '150px' }}>Name</th>
                        <th style={{ width: '120px' }}>Birth Date</th>
                        <th style={{ width: '60px' }}>Age</th>
                        <th style={{ width: '120px' }}>Contact</th>
                        <th style={{ width: '120px' }}>Neighborhood</th>
                        <th style={{ width: '100px' }}>City</th>
                        <th style={{ width: '120px' }}>Family Structure</th>
                        <th style={{ width: '100px' }}>Education</th>
                        <th style={{ width: '80px' }}>English</th>
                        <th style={{ width: '80px' }}>Spanish</th>
                        <th style={{ width: '100px' }}>Last Salary</th>
                        <th style={{ width: '100px' }}>Support Exp.</th>
                        <th style={{ width: '80px' }}>KYC Exp.</th>
                        <th style={{ width: '60px' }}>DISC</th>
                        <th style={{ width: '80px' }}>Weekends</th>
                        <th style={{ width: '60px' }}>CV</th>
                        {group === 'Interview' && (
                          <>
                            <th style={{ width: '150px' }}>Online Interview Date</th>
                            <th style={{ width: '150px' }}>Interview Link</th>
                            <th style={{ width: '150px' }}>In-Person Interview Date</th>
                          </>
                        )}
                        <th style={{ width: group === 'Declined' ? '80px' : '150px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedCandidates[group].map((candidate) => (
                        <tr key={candidate.id} onClick={() => handleRowClick(candidate)}>
                          <td>{candidate.fullName || 'Not provided'}</td>
                          <td>{candidate.birthDate || 'Not provided'}</td>
                          <td>{calculateAge(candidate.birthDate)}</td>
                          <td>{candidate.contact || 'Not provided'}</td>
                          <td>{candidate.neighborhood || 'Not provided'}</td>
                          <td>{candidate.city || 'Not provided'}</td>
                          <td>{candidate.familyStructure || 'Not provided'}</td>
                          <td>{candidate.education || 'Not provided'}</td>
                          <td>{candidate.englishFluency || 'Not provided'}</td>
                          <td>{candidate.spanishFluency || 'Not provided'}</td>
                          <td>{candidate.lastSalary || 'Not provided'}</td>
                          <td>{candidate.customerSupportExperience || 'Not provided'}</td>
                          <td>{candidate.kycExperience || 'Not provided'}</td>
                          <td>{candidate.discProfile || 'Not provided'}</td>
                          <td>{candidate.weekendAvailability || 'Not provided'}</td>
                          <td>
                            <button onClick={(e) => handleViewCV(candidate.cv, e)} title="View CV">
                              <i className="fas fa-file-pdf"></i>
                            </button>
                          </td>
                          {group === 'Interview' && (
                            <>
                              <td>{candidate.interviewDate ? new Date(candidate.interviewDate).toLocaleString() : 'Not scheduled'}</td>
                              <td>{candidate.interviewLink || 'Not scheduled'}</td>
                              <td>{candidate.inPersonDate || 'Not scheduled'}</td>
                            </>
                          )}
                          <td>
                            {group === 'Candidates' && (
                              <div className="action-buttons">
                                <button
                                  onClick={(e) => handleDecline(candidate.id, e)}
                                  className={`action-icon decline ${iconStates[`${candidate.id}-decline`] ? 'clicked' : ''}`}
                                  title="Decline"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                                <button
                                  onClick={(e) => handleHold(candidate.id, e)}
                                  className={`action-icon hold ${iconStates[`${candidate.id}-hold`] ? 'clicked' : ''}`}
                                  title={candidate.status === 'On Hold' ? 'Remove Hold' : 'Place on Hold'}
                                >
                                  <i className="fas fa-pause"></i>
                                </button>
                                <button
                                  onClick={(e) => handleInterview(candidate.id, e)}
                                  className={`action-icon interview ${iconStates[`${candidate.id}-interview`] ? 'clicked' : ''}`}
                                  title="Interview"
                                >
                                  <i className="fas fa-check"></i>
                                </button>
                                {candidate.status === 'On Hold' && (
                                  <span className="status-label on-hold">On Hold</span>
                                )}
                              </div>
                            )}
                            {group === 'Interview' && (
                              <div className="action-buttons">
                                <button
                                  onClick={(e) => handleDecline(candidate.id, e)}
                                  className="action-icon decline"
                                  title="Decline"
                                  style={{ color: '#bdc3c7' }}
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                                <button
                                  onClick={(e) => handleApprove(candidate.id, e)}
                                  className="action-icon approve"
                                  title="Approve"
                                  style={{ color: '#bdc3c7' }}
                                >
                                  <i className="fas fa-check-circle"></i>
                                </button>
                              </div>
                            )}
                            {group === 'Declined' && (
                              <div className="action-buttons">
                                <button
                                  onClick={(e) => handleRestore(candidate.id, e)}
                                  className="action-icon restore"
                                  title="Restore to Interview"
                                  style={{ color: '#0FBC49' }}
                                >
                                  <i className="fas fa-undo"></i>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {selectedCandidate && (
        console.log('Rendering popup for candidate:', selectedCandidate),
        <div className="popup-overlay" style={{ zIndex: 1001 }}>
          <div className="popup-content" style={{ display: 'flex', flexDirection: 'row' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ display: 'inline-block' }}>Candidate Details: {selectedCandidate.fullName}</h2>
              <div className="candidate-details">
                <div className="candidate-photo" style={{ width: '150px', height: '150px', borderRadius: '50%', overflow: 'hidden' }}>
                  {selectedCandidate.photo && selectedCandidate.photo.startsWith('https://') && !photoError ? (
                    <img
                      src={selectedCandidate.photo}
                      alt={selectedCandidate.fullName}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={() => {
                        console.error('Error loading photo:', selectedCandidate.photo);
                        setPhotoError(true);
                      }}
                      onLoad={() => console.log('Photo loaded successfully')}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        background: '#ccc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        color: '#fff',
                      }}
                    >
                      No Photo
                    </div>
                  )}
                </div>
                <p><strong>Full Name:</strong> {selectedCandidate.fullName || 'Not provided'}</p>
                <p><strong>Email:</strong> {selectedCandidate.email || 'Not provided'}</p>
                <p><strong>Birth Date:</strong> {selectedCandidate.birthDate || 'Not provided'}</p>
                <p><strong>Age:</strong> {calculateAge(selectedCandidate.birthDate)}</p>
                <p><strong>Contact (WhatsApp):</strong> {selectedCandidate.contact || 'Not provided'}</p>
                <p><strong>Postal Code:</strong> {selectedCandidate.cep || 'Not provided'}</p>
                <p><strong>Street Name:</strong> {selectedCandidate.street || 'Not provided'}</p>
                <p><strong>House Number:</strong> {selectedCandidate.number || 'Not provided'}</p>
                <p><strong>Complement:</strong> {selectedCandidate.complement || 'Not provided'}</p>
                <p><strong>Neighborhood:</strong> {selectedCandidate.neighborhood || 'Not provided'}</p>
                <p><strong>City:</strong> {selectedCandidate.city || 'Not provided'}</p>
                <p><strong>Family Structure:</strong> {selectedCandidate.familyStructure || 'Not provided'}</p>
                <p><strong>Hobbies:</strong> {selectedCandidate.hobbies || 'Not provided'}</p>
                <p><strong>Personal Goals:</strong> {selectedCandidate.personalGoals || 'Not provided'}</p>
                <p><strong>Education:</strong> {selectedCandidate.education || 'Not provided'}</p>
                <p><strong>English Fluency:</strong> {selectedCandidate.englishFluency || 'Not provided'}</p>
                <p><strong>Spanish Fluency:</strong> {selectedCandidate.spanishFluency || 'Not provided'}</p>
                <p><strong>Courses in the Last Year:</strong> {selectedCandidate.coursesLastYear || 'Not provided'}</p>
                <p><strong>Areas for Development:</strong> {selectedCandidate.developmentAreas || 'Not provided'}</p>
                <p><strong>Professional Goals:</strong> {selectedCandidate.professionalGoals || 'Not provided'}</p>
                <p><strong>Strengths:</strong> {selectedCandidate.strengths || 'Not provided'}</p>
                <p><strong>Last Gross Salary:</strong> {selectedCandidate.lastSalary || 'Not provided'}</p>
                <p><strong>Customer Support Experience:</strong> {selectedCandidate.customerSupportExperience || 'Not provided'}</p>
                <p><strong>KYC Experience:</strong> {selectedCandidate.kycExperience || 'Not provided'}</p>
                <p><strong>Professional Achievement:</strong> {selectedCandidate.professionalAchievement || 'Not provided'}</p>
                <p><strong>Professional Growth Needs:</strong> {selectedCandidate.professionalGrowth || 'Not provided'}</p>
                <p><strong>Motivations:</strong> {selectedCandidate.motivations || 'Not provided'}</p>
                <p><strong>DISC Profile:</strong> {selectedCandidate.discProfile || 'Not provided'}</p>
                <p><strong>Questions About the Position:</strong> {selectedCandidate.doubts || 'Not provided'}</p>
                <p><strong>Availability for Weekends:</strong> {selectedCandidate.weekendAvailability || 'Not provided'}</p>
                <p><strong>Availability to Start:</strong> {selectedCandidate.startAvailability || 'Not provided'}</p>
              </div>
            </div>
            {selectedCandidate.status === 'Interview' && (
              <div style={{ width: '200px', marginLeft: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={sendOnlineInterviewEmail}
                  style={{
                    background: '#2c3e50',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background 0.3s ease',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#34495e'}
                  onMouseLeave={(e) => e.target.style.background = '#2c3e50'}
                >
                  Send: Online Interview Date
                </button>
                <button
                  onClick={copyInterviewLink}
                  style={{
                    background: '#2c3e50',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background 0.3s ease',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#34495e'}
                  onMouseLeave={(e) => e.target.style.background = '#2c3e50'}
                >
                  Copy: Interview Link
                </button>
                <button
                  onClick={sendInPersonInterviewEmail}
                  style={{
                    background: '#2c3e50',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background 0.3s ease',
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#34495e'}
                  onMouseLeave={(e) => e.target.style.background = '#2c3e50'}
                >
                  Send: In-Person Interview Date
                </button>
              </div>
            )}
            <button className="popup-close" onClick={closePopup}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>
      )}

      <div
        ref={sidebarRef}
        className={`event-sidebar ${calendarOpen ? 'expanded' : ''}`}
      >
        <div className="sidebar-content">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '30px',
          }}>
            <h3 style={{
              fontSize: '24px',
              color: '#2c3e50',
              fontWeight: '600',
              margin: 0,
            }}>
              Schedule Interviews
            </h3>
            <button
              onClick={() => {
                setCalendarOpen(false);
                setEditingSlot(null);
                setNewSlot({ date: '', time: '', duration: '30', type: 'online' });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                fontSize: '24px',
                color: '#ff4d4f',
                cursor: 'pointer',
                transition: 'color 0.3s ease',
              }}
              onMouseEnter={(e) => e.target.style.color = '#e63946'}
              onMouseLeave={(e) => e.target.style.color = '#ff4d4f'}
              title="Close Sidebar"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div style={{
            background: '#f9f9f9',
            padding: '20px',
            borderRadius: '10px',
            boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.05)',
            marginBottom: '30px',
          }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              color: '#2c3e50',
              fontWeight: '500',
              marginBottom: '10px',
            }}>
              Select Date:
            </label>
            <input
              type="date"
              value={newSlot.date}
              onChange={(e) => setNewSlot({ ...newSlot, date: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '16px',
                color: '#333',
                background: '#fff',
                outline: 'none',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0FBC49';
                e.target.style.boxShadow = '0 0 8px rgba(15, 188, 73, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = 'none';
              }}
            />
            <label style={{
              display: 'block',
              fontSize: '16px',
              color: '#2c3e50',
              fontWeight: '500',
              margin: '20px 0 10px',
            }}>
              Select Time:
            </label>
            <input
              type="time"
              value={newSlot.time}
              onChange={(e) => setNewSlot({ ...newSlot, time: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '16px',
                color: '#333',
                background: '#fff',
                outline: 'none',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0FBC49';
                e.target.style.boxShadow = '0 0 8px rgba(15, 188, 73, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = 'none';
              }}
            />
            <label style={{
              display: 'block',
              fontSize: '16px',
              color: '#2c3e50',
              fontWeight: '500',
              margin: '20px 0 10px',
            }}>
              Duration (minutes):
            </label>
            <select
              value={newSlot.duration}
              onChange={(e) => setNewSlot({ ...newSlot, duration: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '16px',
                color: '#333',
                background: '#fff',
                outline: 'none',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0FBC49';
                e.target.style.boxShadow = '0 0 8px rgba(15, 188, 73, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="45">45 minutes</option>
              <option value="60">60 minutes</option>
            </select>
            <label style={{
              display: 'block',
              fontSize: '16px',
              color: '#2c3e50',
              fontWeight: '500',
              margin: '20px 0 10px',
            }}>
              Interview Type:
            </label>
            <select
              value={newSlot.type}
              onChange={(e) => setNewSlot({ ...newSlot, type: e.target.value })}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '16px',
                color: '#333',
                background: '#fff',
                outline: 'none',
                transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#0FBC49';
                e.target.style.boxShadow = '0 0 8px rgba(15, 188, 73, 0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e0e0e0';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="online">Online Interview</option>
              <option value="inperson">In-Person Interview</option>
            </select>
            <button
              onClick={handleAddSlot}
              style={{
                width: '100%',
                background: editingSlot ? '#0FBC49' : '#2c3e50',
                color: 'white',
                border: 'none',
                padding: '12px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                marginTop: '20px',
                transition: 'background 0.3s ease, transform 0.1s ease',
              }}
              onMouseEnter={(e) => e.target.style.background = editingSlot ? '#0ed058' : '#34495e'}
              onMouseLeave={(e) => e.target.style.background = editingSlot ? '#0FBC49' : '#2c3e50'}
              onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
            >
              {editingSlot ? 'Update Slot' : 'Add Slot'}
            </button>
            {editingSlot && (
              <button
                onClick={() => {
                  setEditingSlot(null);
                  setNewSlot({ date: '', time: '', duration: '30', type: 'online' });
                }}
                style={{
                  width: '100%',
                  background: '#ff4d4f',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '500',
                  marginTop: '10px',
                  transition: 'background 0.3s ease, transform 0.1s ease',
                }}
                onMouseEnter={(e) => e.target.style.background = '#e63946'}
                onMouseLeave={(e) => e.target.style.background = '#ff4d4f'}
                onMouseDown={(e) => e.target.style.transform = 'scale(0.98)'}
                onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              >
                Cancel Edit
              </button>
            )}
          </div>
          <h4 style={{
            fontSize: '20px',
            color: '#2c3e50',
            fontWeight: '600',
            marginBottom: '15px',
          }}>
            Available Slots
          </h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {availableSlots.map((slot, index) => (
              <li key={index} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: '#f9f9f9',
                padding: '15px',
                margin: '10px 0',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                transition: 'all 0.3s ease',
              }}>
                <span style={{
                  fontSize: '16px',
                  color: '#333',
                  fontWeight: '500',
                }}>
                  {slot.type === 'online' ? 'Online' : 'In-Person'}: {new Date(slot.start).toLocaleString()} - {new Date(slot.end).toLocaleString()}
                </span>
                <div>
                  <button
                    onClick={() => handleEditSlot(slot)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '18px',
                      color: '#bdc3c7',
                      cursor: 'pointer',
                      marginRight: '10px',
                      transition: 'color 0.3s ease, transform 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#2c3e50';
                      e.target.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#bdc3c7';
                      e.target.style.transform = 'scale(1)';
                    }}
                    title="Edit Slot"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDeleteSlot(slot)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '18px',
                      color: '#bdc3c7',
                      cursor: 'pointer',
                      transition: 'color 0.3s ease, transform 0.3s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#ff4d4f';
                      e.target.style.transform = 'scale(1.2)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#bdc3c7';
                      e.target.style.transform = 'scale(1)';
                    }}
                    title="Delete Slot"
                  >
                    <i className="fas fa-trash-alt"></i>
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <h4 style={{
            fontSize: '20px',
            color: '#2c3e50',
            fontWeight: '600',
            marginBottom: '15px',
            marginTop: '30px',
          }}>
            Scheduled Interviews
          </h4>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {scheduledInterviews.map((interview, index) => (
              <li key={index} style={{
                background: '#f9f9f9',
                padding: '15px',
                margin: '10px 0',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '16px',
                color: '#333',
              }}>
                {interview.candidateName}: {interview.type === 'online' ? 'Online' : 'In-Person'} - {new Date(interview.start).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Candidates;