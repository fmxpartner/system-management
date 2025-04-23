import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebase/firebase';
import { collection, addDoc, updateDoc, doc, getDocs, deleteDoc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, fetchSignInMethodsForEmail } from 'firebase/auth';
import { IMaskInput } from 'react-imask';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import b2HiveLogo from '../assets/b2Hive.png';
import exnieLogo from '../assets/exnie.png';
import fundsCapLogo from '../assets/fundsCap.png';
import onEquityLogo from '../assets/onEquity.png';

function Team({ addNotification }) {
  const [employees, setEmployees] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [expandedGroups, setExpandedGroups] = useState({
    Active: true,
    Onboarding: false,
    Hiring: false,
    Deactivated: false,
  });

  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: 'São Paulo',
    state: 'SP',
    cep: '',
    contact: '',
    email: '',
    password: '',
    status: 'Hiring',
    gender: 'Male',
    maritalStatus: '',
    race: '',
    nationality: 'Brazilian',
    naturality: 'Brazil',
    education: '',
    rg: '',
    cpf: '',
    pis: '',
    firstJob: 'No',
    rne: '',
    rneValidity: '',
    visaType: '',
    contractType: 'Employee/CLT',
    admissionDate: '',
    role: 'Junior Administrative Analyst',
    salary: '',
    trialPeriod1: '',
    trialPeriod2: '',
    advance: 'No',
    workScheduleStart: '',
    workScheduleEnd: '',
    breakDuration: '',
    breakStart: '',
    breakEnd: '',
    daysOff: 'Sunday/Weekday',
    transportAllowance: 'No',
    transportAllowanceValue: '',
    mealAllowance: 'No',
    mealAllowanceValue: '',
    brands: {
      b2Hive: false,
      exnie: false,
      fundsCap: false,
      onEquity: false,
    },
    hiringProcess: {
      emailInvite: false,
      docsSent: false,
      addressProof: false,
      ctpsDigital: false,
      rgCnh: false,
      cpf: false,
      nis: false,
      advanceCancellationLetter: false,
      aso: false,
      admissionDocs: false,
      corporateEmailAccess: false,
      crmAccess: false,
      notebookOk: false,
      notebookPowerOk: false,
      appsInstalled: false,
      additionalScreenOk: false,
    },
    dismissalProcess: {
      corporateCommunication: false,
      hrCommunication: false,
      dismissalExam: false,
      examGuidePrinted: false,
      employeeNotice: false,
      hrHomologationDocs: false,
      printedHomologationDocs: false,
      debtorPayment: false,
      managerSignature: false,
      employeeSignature: false,
    },
    dismissalDate: '',
    homologationDate: '',
    isDismissalPopupOpen: false,
  });
  const [isFormDirty, setIsFormDirty] = useState(false);

  // Function to generate a random secure password
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  // Fetch employees from Firestore and calculate events
  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'employees'));
        const employeesList = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        // Update status based on admission date
        const today = new Date();
        const updatedEmployees = employeesList.map((employee) => {
          const admissionDate = employee.admissionDate;
          if (!admissionDate || typeof admissionDate !== 'string') {
            return employee;
          }

          const [day, month, year] = admissionDate.split('/');
          const admission = new Date(`${year}-${month}-${day}`);
          if (isNaN(admission.getTime())) {
            return employee;
          }

          const onboardingDate = new Date(admission);
          const activeDate = new Date(admission);
          activeDate.setDate(admission.getDate() + 1); // Assume onboarding completes after 1 day

          let newStatus = employee.status;
          if (today.toDateString() === admission.toDateString() && newStatus === 'Hiring') {
            newStatus = 'Onboarding';
          } else if (today > activeDate && (newStatus === 'Hiring' || newStatus === 'Onboarding')) {
            newStatus = 'Active';
          }

          return { ...employee, status: newStatus };
        });

        // Sort employees alphabetically within each group
        const sortedEmployees = updatedEmployees.sort((a, b) => a.name.localeCompare(b.name));
        setEmployees(sortedEmployees);

        // Update Firestore with new statuses
        updatedEmployees.forEach(async (employee) => {
          if (employee.status !== employees.find((e) => e.id === employee.id)?.status) {
            const employeeRef = doc(db, 'employees', employee.id);
            await updateDoc(employeeRef, { status: employee.status });
          }
        });

        // Calculate events for the current month
        updateEvents(sortedEmployees);
      } catch (error) {
        console.error('Error fetching employees:', error.message);
      }
    };

    fetchEmployees();
  }, []);

  // Update events at the start of each month and emit notifications every Monday
  useEffect(() => {
    const today = new Date();
    const dayOfMonth = today.getDate();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const hour = today.getHours();

    // Update events on the 1st of each month
    if (dayOfMonth === 1) {
      updateEvents(employees);
    }

    // Emit notifications every Monday at 00:00
    if (dayOfWeek === 1 && hour === 0) {
      emitNotifications();
    }
  }, [employees]);

  // Function to update events
  const updateEvents = (employeesList) => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const eventsList = [];

    employeesList.forEach((employee) => {
      // Event: Birthday
      if (employee.birthDate && employee.birthDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month] = employee.birthDate.split('/');
        const birthDateThisYear = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        if (birthDateThisYear.getMonth() === currentMonth) {
          eventsList.push({
            name: employee.name,
            date: employee.birthDate,
            event: 'Birthday',
          });
        }
      }

      // Event: Company Anniversary
      if (employee.admissionDate && employee.admissionDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month] = employee.admissionDate.split('/');
        const admissionDateThisYear = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        if (admissionDateThisYear.getMonth() === currentMonth) {
          eventsList.push({
            name: employee.name,
            date: employee.admissionDate,
            event: 'Company Anniversary',
          });
        }
      }

      // Event: End of Trial Period 1 and 2
      if (employee.trialPeriod1 && employee.trialPeriod1.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month] = employee.trialPeriod1.split('/');
        const trial1End = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        if (trial1End.getMonth() === currentMonth) {
          eventsList.push({
            name: employee.name,
            date: employee.trialPeriod1,
            event: 'End of Trial Period 1',
          });
        }
      }

      if (employee.trialPeriod2 && employee.trialPeriod2.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        const [day, month] = employee.trialPeriod2.split('/');
        const trial2End = new Date(currentYear, parseInt(month) - 1, parseInt(day));
        if (trial2End.getMonth() === currentMonth) {
          eventsList.push({
            name: employee.name,
            date: employee.trialPeriod2,
            event: 'End of Trial Period 2',
          });
        }
      }
    });

    setEvents(eventsList);
  };

  // Function to emit notifications
  const emitNotifications = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Start of the week (Monday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of the week (Sunday)

    events.forEach((event) => {
      const [day, month, year] = event.date.split('/');
      const eventDate = new Date(year, parseInt(month) - 1, parseInt(day));
      if (eventDate >= startOfWeek && eventDate <= endOfWeek) {
        addNotification(`${event.event} of ${event.name} on ${event.date}`);
      }
    });
  };

  // Calculate trial periods automatically
  useEffect(() => {
    if (formData.admissionDate && formData.admissionDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = formData.admissionDate.split('/');
      const admission = new Date(`${year}-${month}-${day}`);
      if (!isNaN(admission.getTime())) {
        const trial1End = new Date(admission);
        trial1End.setDate(admission.getDate() + 45);
        const trial2End = new Date(trial1End);
        trial2End.setDate(trial1End.getDate() + 45);

        setFormData((prev) => ({
          ...prev,
          trialPeriod1: `${String(trial1End.getDate()).padStart(2, '0')}/${String(
            trial1End.getMonth() + 1
          ).padStart(2, '0')}/${trial1End.getFullYear()}`,
          trialPeriod2: `${String(trial2End.getDate()).padStart(2, '0')}/${String(
            trial2End.getMonth() + 1
          ).padStart(2, '0')}/${trial2End.getFullYear()}`,
        }));
      }
    }
  }, [formData.admissionDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formattedData = {
      ...formData,
      salary: formData.salary ? formData.salary.replace(/[^0-9,]/g, '') : '',
      transportAllowanceValue: formData.transportAllowanceValue
        ? formData.transportAllowanceValue.replace(/[^0-9,]/g, '')
        : '',
      mealAllowanceValue: formData.mealAllowanceValue
        ? formData.mealAllowanceValue.replace(/[^0-9,]/g, '')
        : '',
    };

    try {
      if (editingEmployee) {
        const employeeRef = doc(db, 'employees', editingEmployee.id);
        await updateDoc(employeeRef, formattedData);
        setEmployees(
          employees.map((emp) =>
            emp.id === editingEmployee.id ? { id: editingEmployee.id, ...formattedData } : emp
          )
        );
      } else {
        // Check if the email already exists in Firebase Authentication
        const signInMethods = await fetchSignInMethodsForEmail(auth, formattedData.email);
        if (signInMethods.length > 0) {
          throw new Error('This email is already registered in Firebase Authentication. Please use a different email or remove the existing user from the Firebase Console.');
        }

        // Generate password for new employee
        const password = generatePassword();
        formattedData.password = password;

        // Register user in Firebase Auth
        await createUserWithEmailAndPassword(auth, formattedData.email, password);

        // Set initial permissions in Firestore (sync with Permissions page)
        const initialPermissions = {
          name: formattedData.name || 'N/A',
          frozen: false,
          hr_people: false,
          hr_vacation_shifts: false,
          training_onequity: false,
          training_exnie: false,
          training_b2hive: false,
          training_fundscap: false,
          training_video: false,
          training_onboarding: false,
          finance: false,
          app_on_ai: false,
          app_on_ic: false,
          app_on_termination: false,
          app_on_cc: false,
          app_on_templates: false,
          app_on_html: false,
          app_on_tp: false,
          app_on_lp: false,
          app_ex_om: false,
          app_ex_ta: false,
          app_ex_templates: false,
          app_html: false,
        };
        await setDoc(doc(db, 'permissions', formattedData.email), initialPermissions);

        // Save employee in Firestore
        const docRef = await addDoc(collection(db, 'employees'), formattedData);
        setEmployees([...employees, { id: docRef.id, ...formattedData }]);

        // Copy credentials to clipboard
        const credentials = `Login: ${formattedData.email}\nPassword: ${password}`;
        navigator.clipboard.writeText(credentials);
        alert(`Employee added successfully! Credentials copied to clipboard:\n${credentials}`);
      }
      setShowSuccessPopup(true);
      setTimeout(() => {
        setShowSuccessPopup(false);
        closePopup();
      }, 2000);
    } catch (error) {
      console.error('Error saving employee:', error.message);
      alert('Error saving employee: ' + error.message);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isPopupOpen) {
        if (isFormDirty) {
          const confirmSave = window.confirm(
            'You have made changes to the form. Do you want to save before closing?'
          );
          if (confirmSave) {
            handleSubmit(e);
          } else {
            closePopup();
          }
        } else {
          closePopup();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPopupOpen, isFormDirty, handleSubmit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setIsFormDirty(true);
  };

  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    let updatedField = {};
    if (name.startsWith('hiringProcess.')) {
      updatedField = {
        hiringProcess: {
          ...formData.hiringProcess,
          [name.replace('hiringProcess.', '')]: checked,
        },
      };
    } else if (name.startsWith('dismissalProcess.')) {
      updatedField = {
        dismissalProcess: {
          ...formData.dismissalProcess,
          [name.replace('dismissalProcess.', '')]: checked,
        },
      };
    }
    setFormData((prev) => ({
      ...prev,
      ...updatedField,
    }));
    setIsFormDirty(true);
  };

  const handleBrandChange = (brand, checked) => {
    setFormData((prev) => ({
      ...prev,
      brands: { ...prev.brands, [brand]: checked },
    }));
    setIsFormDirty(true);
  };

  const copyEmailInvite = () => {
    const firstName = formData.name ? formData.name.split(' ')[0] : '(Name)';
    const message = `Hello ${firstName}!
I hope you are doing well!

${firstName}, attached is the welcome letter to our organization (DOC1). Please read it carefully as there are documents to be sent.
We are excited to have you on our team!

DOC 1 - Welcome Letter - Please read carefully, fill in your name, ID, sign, and send it back to us.
DOC 2 - Important Documents and Information for Your Hiring - Follow the instructions in the document and send it to us via email.
DOC 3 - Transportation Voucher Waiver Declaration - If you will not use it, please fill it out. If you will use it, disregard.
DOC 4 - Advance Opt-Out Letter - We make all payments at the beginning of the month, so we need you to fill in the details, sign, and send it to us via email.

Your start date is scheduled for ${formData.admissionDate || '(Admission Date)'} at 09:00 at the address below:
Rua Vilela, 665, CJ1704, Tatuapé, São Paulo - SP, 03314-000
The working hours for the position will be from 13:00 to 22:00, but on the first day, please arrive at 09:00 for onboarding.

We look forward to your response with the required documents.

Best regards,
FMX Consulting Team`;

    navigator.clipboard.writeText(message).then(() => {
      alert('Email invite message copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy email invite message:', err);
      alert('Failed to copy email invite message. Please copy manually.');
    });
  };

  const copyCorporateEmailRequest = () => {
    const message = `Hello team,
I hope you are doing well!

We will have a new coworker, and I am writing to request access for them via email.
The expected start date is ${formData.admissionDate || '(Admission Date)'}, so I need the following access:
1 - Corporate email
2 - Access to CRM
3 - Access to MS Teams.

Name of new employee: ${formData.name || '(Full Name)'}
Position: Support and KYC

Thank you for your attention, and I am available for any questions you may have.`;

    navigator.clipboard.writeText(message).then(() => {
      alert('Corporate email request message copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy corporate email request message:', err);
      alert('Failed to copy corporate email request message. Please copy it manually.');
    });
  };

  const copyCorporateCommunication = () => {
    const employeeName = formData.name || '(Name)';
    const dismissalDate = formData.dismissalDate || '(Dismissal Date)';
    const message = `
Dear Team,

I hope this message finds you well.

It is with mixed emotions that I inform you that our colleague ${employeeName} will no longer be part of our team, effective as of ${dismissalDate}. We extend our gratitude for their contributions and wish them the very best in their future endeavors.

To ensure a smooth transition, please proceed with the removal of all access privileges for ${employeeName} by ${dismissalDate}. Should you have any questions or require further assistance, please do not hesitate to contact me.

Warm regards,  
FMX Consulting Team`;

    navigator.clipboard.writeText(message).then(() => {
      alert('Corporate communication message copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy corporate communication message:', err);
      alert('Failed to copy corporate communication message. Please copy it manually.');
    });
  };

  const copyHRCommunication = () => {
    const employeeName = formData.name || '(Name)';
    const dismissalDate = formData.dismissalDate || '(Dismissal Date)';
    const message = `
Dear,

I hope you are well!

Please proceed with the dismissal process for the employee ${employeeName}, effective on ${dismissalDate}. If you have any questions, I am available.

Best regards,  
FMX Consulting Team`;

    navigator.clipboard.writeText(message).then(() => {
      alert('HR communication message copied to clipboard!');
    }).catch((err) => {
      console.error('Failed to copy HR communication message:', err);
      alert('Failed to copy HR communication message. Please copy it manually.');
    });
  };

  const openPopup = (employee = null, showDismissal = false) => {
    if (employee) {
      setEditingEmployee(employee);
      setFormData({
        ...employee,
        brands: employee.brands || {
          b2Hive: false,
          exnie: false,
          fundsCap: false,
          onEquity: false,
        },
        hiringProcess: employee.hiringProcess || {
          emailInvite: false,
          docsSent: false,
          addressProof: false,
          ctpsDigital: false,
          rgCnh: false,
          cpf: false,
          nis: false,
          advanceCancellationLetter: false,
          aso: false,
          admissionDocs: false,
          corporateEmailAccess: false,
          crmAccess: false,
          notebookOk: false,
          notebookPowerOk: false,
          appsInstalled: false,
          additionalScreenOk: false,
        },
        dismissalProcess: employee.dismissalProcess || {
          corporateCommunication: false,
          hrCommunication: false,
          dismissalExam: false,
          examGuidePrinted: false,
          employeeNotice: false,
          hrHomologationDocs: false,
          printedHomologationDocs: false,
          debtorPayment: false,
          managerSignature: false,
          employeeSignature: false,
        },
        dismissalDate: employee.dismissalDate || '',
        homologationDate: employee.dismissalDate ? calculateHomologationDate(employee.dismissalDate) : '',
        isDismissalPopupOpen: showDismissal,
      });
    } else {
      setEditingEmployee(null);
      setFormData({
        name: '',
        birthDate: '',
        street: '',
        number: '',
        complement: '',
        neighborhood: '',
        city: 'São Paulo',
        state: 'SP',
        cep: '',
        contact: '',
        email: '',
        password: '',
        status: 'Hiring',
        gender: 'Male',
        maritalStatus: '',
        race: '',
        nationality: 'Brazilian',
        naturality: 'Brazil',
        education: '',
        rg: '',
        cpf: '',
        pis: '',
        firstJob: 'No',
        rne: '',
        rneValidity: '',
        visaType: '',
        contractType: 'Employee/CLT',
        admissionDate: '',
        role: 'Junior Administrative Analyst',
        salary: '',
        trialPeriod1: '',
        trialPeriod2: '',
        advance: 'No',
        workScheduleStart: '',
        workScheduleEnd: '',
        breakDuration: '',
        breakStart: '',
        breakEnd: '',
        daysOff: 'Sunday/Weekday',
        transportAllowance: 'No',
        transportAllowanceValue: '',
        mealAllowance: 'No',
        mealAllowanceValue: '',
        brands: {
          b2Hive: false,
          exnie: false,
          fundsCap: false,
          onEquity: false,
        },
        hiringProcess: {
          emailInvite: false,
          docsSent: false,
          addressProof: false,
          ctpsDigital: false,
          rgCnh: false,
          cpf: false,
          nis: false,
          advanceCancellationLetter: false,
          aso: false,
          admissionDocs: false,
          corporateEmailAccess: false,
          crmAccess: false,
          notebookOk: false,
          notebookPowerOk: false,
          appsInstalled: false,
          additionalScreenOk: false,
        },
        dismissalProcess: {
          corporateCommunication: false,
          hrCommunication: false,
          dismissalExam: false,
          examGuidePrinted: false,
          employeeNotice: false,
          hrHomologationDocs: false,
          printedHomologationDocs: false,
          debtorPayment: false,
          managerSignature: false,
          employeeSignature: false,
        },
        dismissalDate: '',
        homologationDate: '',
        isDismissalPopupOpen: false,
      });
    }
    setIsPopupOpen(true);
    setIsFormDirty(false);
  };

  const closePopup = () => {
    setIsPopupOpen(false);
    setEditingEmployee(null);
    setIsFormDirty(false);
    setFormData((prev) => ({
      ...prev,
      isDismissalPopupOpen: false,
    }));
  };

  const handleDismissal = async (employeeId) => {
    try {
      const employee = employees.find((emp) => emp.id === employeeId);
      if (!employee) return;

      const confirmDismissal = window.confirm('Are you sure you want to dismiss this employee?');
      if (confirmDismissal) {
        setEditingEmployee(employee);
        setFormData({
          ...employee,
          brands: employee.brands || {
            b2Hive: false,
            exnie: false,
            fundsCap: false,
            onEquity: false,
          },
          hiringProcess: employee.hiringProcess || {
            emailInvite: false,
            docsSent: false,
            addressProof: false,
            ctpsDigital: false,
            rgCnh: false,
            cpf: false,
            nis: false,
            advanceCancellationLetter: false,
            aso: false,
            admissionDocs: false,
            corporateEmailAccess: false,
            crmAccess: false,
            notebookOk: false,
            notebookPowerOk: false,
            appsInstalled: false,
            additionalScreenOk: false,
          },
          dismissalProcess: employee.dismissalProcess || {
            corporateCommunication: false,
            hrCommunication: false,
            dismissalExam: false,
            examGuidePrinted: false,
            employeeNotice: false,
            hrHomologationDocs: false,
            printedHomologationDocs: false,
            debtorPayment: false,
            managerSignature: false,
            employeeSignature: false,
          },
          dismissalDate: employee.dismissalDate || '',
          homologationDate: employee.dismissalDate ? calculateHomologationDate(employee.dismissalDate) : '',
          isDismissalPopupOpen: true,
        });
        setIsPopupOpen(true);
      }
    } catch (error) {
      console.error('Error initiating dismissal:', error.message);
      alert('Error initiating dismissal: ' + error.message);
    }
  };

  const calculateHomologationDate = (dismissalDate) => {
    if (!dismissalDate || !dismissalDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) return '';
    const [day, month, year] = dismissalDate.split('/');
    const date = new Date(`${year}-${month}-${day}`);
    if (isNaN(date.getTime())) return '';
    date.setDate(date.getDate() + 10); // Add 10 days
    return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
  };

  const finalizeDismissal = async () => {
    if (Object.values(formData.dismissalProcess).every((checked) => checked)) {
      const employeeRef = doc(db, 'employees', editingEmployee.id);
      await updateDoc(employeeRef, {
        status: 'Deactivated',
        dismissalDate: formData.dismissalDate,
        homologationDate: formData.homologationDate,
        dismissalProcess: formData.dismissalProcess,
      });
      setEmployees(
        employees.map((emp) =>
          emp.id === editingEmployee.id
            ? { ...emp, status: 'Deactivated', dismissalDate: formData.dismissalDate, homologationDate: formData.homologationDate, dismissalProcess: formData.dismissalProcess }
            : emp
        )
      );
      closePopup();
    } else {
      alert('Please complete all dismissal process steps before finalizing.');
    }
  };

  const calculateContractStatus = (admissionDate) => {
    if (!admissionDate || typeof admissionDate !== 'string') {
      return { status: 'Undefined', expiry: 'Undefined' };
    }

    let date;
    if (admissionDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = admissionDate.split('/');
      date = new Date(`${year}-${month}-${day}`);
    } else if (admissionDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(admissionDate);
    } else {
      return { status: 'Undefined', expiry: 'Undefined' };
    }

    if (isNaN(date.getTime())) {
      return { status: 'Undefined', expiry: 'Undefined' };
    }

    const trial1End = new Date(date);
    trial1End.setDate(date.getDate() + 45);
    const trial2End = new Date(trial1End);
    trial2End.setDate(trial1End.getDate() + 45);
    const today = new Date();

    if (today >= date && today <= trial1End) {
      return {
        status: 'Trial 1',
        expiry: `${String(trial1End.getDate()).padStart(2, '0')}/${String(
          trial1End.getMonth() + 1
        ).padStart(2, '0')}/${trial1End.getFullYear()}`,
      };
    } else if (today > trial1End && today <= trial2End) {
      return {
        status: 'Trial 2',
        expiry: `${String(trial2End.getDate()).padStart(2, '0')}/${String(
          trial2End.getMonth() + 1
        ).padStart(2, '0')}/${trial2End.getFullYear()}`,
      };
    } else {
      return { status: 'Permanent', expiry: 'No expiry' };
    }
  };

  const calculateWorkDuration = (admissionDate) => {
    if (!admissionDate || typeof admissionDate !== 'string') {
      return 'Undefined';
    }

    let date;
    if (admissionDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
      const [day, month, year] = admissionDate.split('/');
      date = new Date(`${year}-${month}-${day}`);
    } else if (admissionDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(admissionDate);
    } else {
      return 'Undefined';
    }

    if (isNaN(date.getTime())) {
      return 'Undefined';
    }

    const today = new Date();
    let years = today.getFullYear() - date.getFullYear();
    let months = today.getMonth() - date.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (today.getDate() < date.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }

    if (years < 0) {
      return 'Not started';
    }

    let result = '';
    if (years > 0) {
      result += `${years}y`;
    }
    if (months > 0) {
      if (result) result += ' ';
      result += `${months}m`;
    }
    return result || '<1m';
  };

  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    const number = parseFloat(value.replace(/[^0-9,]/g, '').replace(',', '.'));
    return number.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const downloadAdmissionForm = () => {
    const doc = new jsPDF();

    doc.setFontSize(16);
    doc.text('Admission Form', 105, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.text('FMX Consulting Ltd', 105, 25, { align: 'center' });
    doc.text('CNPJ: 48.786.011/0001-75', 105, 35, { align: 'center' });

    doc.setFontSize(14);
    doc.text('Employee Details', 20, 50);
    autoTable(doc, {
      startY: 55,
      head: [['Field', 'Value']],
      body: [
        ['Name', formData.name || '-'],
        ['Date of Birth', formData.birthDate || '-'],
        ['Street', formData.street || '-'],
        ['Number', formData.number || '-'],
        ['Complement', formData.complement || '-'],
        ['Neighborhood', formData.neighborhood || '-'],
        ['City', formData.city || '-'],
        ['State', formData.state || '-'],
        ['Postal Code', formData.cep || '-'],
        ['Contact', formData.contact || '-'],
        ['Email', formData.email || '-'],
        ['Gender', formData.gender === 'Male' ? 'Male' : formData.gender === 'Female' ? 'Female' : '-'],
        ['Marital Status', formData.maritalStatus || '-'],
        ['Race/Ethnicity', formData.race || '-'],
        ['Nationality', formData.nationality || '-'],
        ['Naturality', formData.naturality || '-'],
        ['Education', formData.education || '-'],
        ['ID (RG)', formData.rg || '-'],
        ['CPF', formData.cpf || '-'],
        ['PIS', formData.pis || '-'],
        ['First Job', formData.firstJob === 'Yes' ? 'Yes' : formData.firstJob === 'No' ? 'No' : '-'],
        ['RNE (If Foreigner)', formData.rne || '-'],
        ['Validity', formData.rneValidity || '-'],
        ['Visa Type', formData.visaType || '-'],
      ],
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
      bodyStyles: { fillColor: [248, 250, 252] },
    });

    doc.setFontSize(14);
    doc.text('Employer Details', 20, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: [
        ['Contract Type', formData.contractType || '-'],
        ['Admission Date', formData.admissionDate || '-'],
        ['Role', formData.role || '-'],
        ['Salary', formData.salary || '-'],
        ['Trial Period 1', formData.trialPeriod1 || '-'],
        ['Trial Period 2', formData.trialPeriod2 || '-'],
        ['Advance', formData.advance === 'Yes' ? 'Yes' : formData.advance === 'No' ? 'No' : '-'],
        ['Start Time', formData.workScheduleStart || '-'],
        ['End Time', formData.workScheduleEnd || '-'],
        ['Break', `${formData.breakDuration || '-'} hours from ${formData.breakStart || '-'} to ${formData.breakEnd || '-'}`],
        ['Days Off', formData.daysOff || '-'],
      ],
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
      bodyStyles: { fillColor: [248, 250, 252] },
    });

    doc.setFontSize(14);
    doc.text('Benefits', 20, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Field', 'Value']],
      body: [
        ['Transportation Allowance', formData.transportAllowance === 'Yes' ? 'Yes' : formData.transportAllowance === 'No' ? 'No' : '-'],
        ['Daily Value (Transportation Allowance)', formData.transportAllowanceValue || '-'],
        ['Meal Allowance', formData.mealAllowance === 'Yes' ? 'Yes' : formData.mealAllowance === 'No' ? 'No' : '-'],
        ['Daily Value (Meal Allowance)', formData.mealAllowanceValue || '-'],
      ],
      styles: { fontSize: 10, cellPadding: 3 },
      headStyles: { fillColor: [44, 62, 80], textColor: [255, 255, 255] },
      bodyStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`${formData.name || 'employee'}_Admission_Form.pdf`);
  };

  const isFormComplete = () => {
    const requiredFields = [
      'name',
      'birthDate',
      'street',
      'number',
      'neighborhood',
      'city',
      'state',
      'cep',
      'contact',
      'email',
      'maritalStatus',
      'race',
      'education',
      'rg',
      'cpf',
      'pis',
      'salary',
      'workScheduleStart',
      'workScheduleEnd',
      'breakDuration',
      'breakStart',
      'breakEnd',
    ];
    return requiredFields.every((field) => formData[field] && formData[field].trim() !== '');
  };

  // Function to extract first and last name
  const getShortName = (fullName) => {
    if (!fullName) return 'Not informed';
    const nameParts = fullName.trim().split(' ');
    if (nameParts.length === 1) return nameParts[0]; // Only one name
    return `${nameParts[0]} ${nameParts[nameParts.length - 1]}`; // First and last name
  };

  // Group employees by status
  const groupedEmployees = {
    Active: employees.filter((emp) => emp.status === 'Active'),
    Onboarding: employees.filter((emp) => emp.status === 'Onboarding'),
    Hiring: employees.filter((emp) => emp.status === 'Hiring'),
    Deactivated: employees.filter((emp) => emp.status === 'Deactivated'),
  };

  const toggleGroup = (group) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [group]: !prev[group],
    }));
  };

  return (
    <div className="team-container">
      <div className="header-actions">
        <button
          onClick={() => openPopup()}
          className="add-employee-icon"
          title="Add Employee"
        >
          <i className="fas fa-plus"></i>
        </button>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="sidebar-toggle"
          title="Events"
        >
          <i className="fas fa-calendar-alt"></i>
        </button>
      </div>
      <div className="team-table-wrapper">
        <div className="permissions-table-container">
          {['Active', 'Onboarding', 'Hiring', 'Deactivated'].map((group) => (
            <div key={group} className="status-group">
              <div className="group-header" onClick={() => toggleGroup(group)}>
              <h3>{group} {groupedEmployees[group].length}</h3>
                <i className={`fas fa-chevron-${expandedGroups[group] ? 'up' : 'down'}`}></i>
              </div>
              {expandedGroups[group] && (
                <div className="table-scroll-wrapper">
                  <table className="permissions-table">
                    <thead>
                      <tr>{/* No spaces or line breaks between <th> elements */}
                        <th>Name</th><th>Neighborhood</th><th>City</th><th>Admission Date</th>{group === 'Deactivated' && <th>Dismissal Date</th>}<th>Contract</th><th>Work Duration</th><th>Expiry</th><th>Salary</th><th>Schedule</th><th>Brands</th>{group !== 'Deactivated' && <th>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {groupedEmployees[group].map((employee) => {
                        const { status, expiry } = calculateContractStatus(employee.admissionDate);
                        return (
                          <tr key={employee.id}>
                            <td onClick={() => openPopup(employee, employee.isDismissalPopupOpen || false)} style={{ cursor: 'pointer', color: '#2c3e50' }}>
                              {getShortName(employee.name)}
                            </td>
                            <td>{employee.neighborhood || 'Not informed'}</td>
                            <td>{employee.city || 'Not informed'}</td>
                            <td>{employee.admissionDate || 'Not informed'}</td>
                            {group === 'Deactivated' && <td>{employee.dismissalDate || 'Not informed'}</td>}
                            <td>{status}</td>
                            <td>{calculateWorkDuration(employee.admissionDate)}</td>
                            <td>{expiry}</td>
                            <td>{formatCurrency(employee.salary)}</td>
                            <td>{`${employee.workScheduleStart || 'Not informed'} - ${
                              employee.workScheduleEnd || 'Not informed'
                            }`}</td>
                            <td className="brands-cell">
                              {employee.brands?.b2Hive && <img src={b2HiveLogo} alt="b2Hive" title="b2Hive" className="brand-logo-table" />}
                              {employee.brands?.exnie && <img src={exnieLogo} alt="exnie" title="Exnie" className="brand-logo-table" />}
                              {employee.brands?.fundsCap && <img src={fundsCapLogo} alt="fundsCap" title="FundsCap" className="brand-logo-table" />}
                              {employee.brands?.onEquity && <img src={onEquityLogo} alt="onEquity" title="OnEquity" className="brand-logo-table" />}
                              {(!employee.brands || (!employee.brands.b2Hive && !employee.brands.exnie && !employee.brands.fundsCap && !employee.brands.onEquity)) && 'None'}
                            </td>
                            {group !== 'Deactivated' && (
                              <td>
                                {employee.status !== 'Deactivated' && (
                                  <button onClick={() => handleDismissal(employee.id)} title="Dismiss">
                                    <i className="fas fa-user-times"></i>
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
        <div className={`event-sidebar ${isSidebarOpen ? 'expanded' : ''}`}>
          {isSidebarOpen && (
            <div className="sidebar-content">
              <h3>Events</h3>
              <table className="permissions-table">
                <thead>
                  <tr>{/* No spaces or line breaks between <th> elements */}
                    <th>Name</th><th>Date</th><th>Event</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((event, index) => (
                    <tr key={index}>
                      <td>{event.name}</td>
                      <td>{event.date}</td>
                      <td>{event.event}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr>
                      <td colSpan="3" style={{ textAlign: 'center' }}>
                        No events this month
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
  
      {isPopupOpen && (
        <div className="popup">
          <div className="popup-content">
            <h3>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h3>
            <div className="company-info">
              <div className="company-name">FMX CONSULTING LTD</div>
              <div className="cnpj">CNPJ: 48.786.011/0001-75</div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="section-title">Hiring Process Checklist</div>
              <div className="checkbox-list">
                <ul className="checkbox-column">
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.emailInvite"
                      checked={formData.hiringProcess.emailInvite}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Email Invite</span>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={copyEmailInvite}
                      title="Copy Email Invite Message"
                    >
                      <i className="fas fa-copy"></i> Copy
                    </button>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.docsSent"
                      checked={formData.hiringProcess.docsSent}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Docs 1 to 4 Sent</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.addressProof"
                      checked={formData.hiringProcess.addressProof}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Proof of Address</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.ctpsDigital"
                      checked={formData.hiringProcess.ctpsDigital}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Digital CTPS</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.rgCnh"
                      checked={formData.hiringProcess.rgCnh}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">ID (RG) / Driver's License (CNH)</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.cpf"
                      checked={formData.hiringProcess.cpf}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">CPF</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.nis"
                      checked={formData.hiringProcess.nis}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">NIS</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.advanceCancellationLetter"
                      checked={formData.hiringProcess.advanceCancellationLetter}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Advance Cancellation Letter</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.aso"
                      checked={formData.hiringProcess.aso}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">ASO</span>
                  </li>
                </ul>
                <ul className="checkbox-column">
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.admissionDocs"
                      checked={formData.hiringProcess.admissionDocs}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Admission Documents (HR)</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.corporateEmailAccess"
                      checked={formData.hiringProcess.corporateEmailAccess}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Corporate Email</span>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={copyCorporateEmailRequest}
                      title="Copy Corporate Email Request"
                    >
                      <i className="fas fa-copy"></i> Copy
                    </button>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.crmAccess"
                      checked={formData.hiringProcess.crmAccess}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">CRM Access</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.notebookOk"
                      checked={formData.hiringProcess.notebookOk}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Notebook</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.notebookPowerOk"
                      checked={formData.hiringProcess.notebookPowerOk}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Power Supply</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.appsInstalled"
                      checked={formData.hiringProcess.appsInstalled}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Apps Installed</span>
                  </li>
                  <li className="checkbox-item">
                    <input
                      type="checkbox"
                      name="hiringProcess.additionalScreenOk"
                      checked={formData.hiringProcess.additionalScreenOk}
                      onChange={handleCheckboxChange}
                    />
                    <span className="checkbox-label">Additional Screen</span>
                  </li>
                </ul>
              </div>
  
              <div className="section-title">Employee Details</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="input-name"
                  />
                </div>
                <div className="form-group">
                  <label>Date of Birth</label>
                  <IMaskInput
                    mask="00/00/0000"
                    value={formData.birthDate}
                    onAccept={(value) => setFormData((prev) => ({ ...prev, birthDate: value }))}
                    placeholder="DD/MM/YYYY"
                    className="input-birthdate"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Street</label>
                  <input
                    type="text"
                    name="street"
                    value={formData.street}
                    onChange={handleInputChange}
                    className="input-street"
                  />
                </div>
                <div className="form-group">
                  <label>Number</label>
                  <input
                    type="text"
                    name="number"
                    value={formData.number}
                    onChange={handleInputChange}
                    className="input-number"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Complement</label>
                  <input
                    type="text"
                    name="complement"
                    value={formData.complement}
                    onChange={handleInputChange}
                    className="input-complement"
                  />
                </div>
                <div className="form-group">
                  <label>Neighborhood</label>
                  <input
                    type="text"
                    name="neighborhood"
                    value={formData.neighborhood}
                    onChange={handleInputChange}
                    className="input-neighborhood"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="input-city"
                  />
                </div>
                <div className="form-group">
                  <label>State</label>
                  <input
                    type="text"
                    name="state"
                    value={formData.state}
                    onChange={handleInputChange}
                    className="input-state"
                  />
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <IMaskInput
                    mask="00000-000"
                    value={formData.cep}
                    onAccept={(value) => setFormData((prev) => ({ ...prev, cep: value }))}
                    placeholder="12345-678"
                    className="input-cep"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contact</label>
                  <IMaskInput
                    mask="(00) 00000-0000"
                    value={formData.contact}
                    onAccept={(value) => setFormData((prev) => ({ ...prev, contact: value }))}
                    placeholder="(11) 91234-5678"
                    className="input-contact"
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="input-email"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password || 'Will be generated'}
                    readOnly
                    className="input-email"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange} className="input-gender">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Marital Status</label>
                  <select
                    name="maritalStatus"
                    value={formData.maritalStatus}
                    onChange={handleInputChange}
                    className="input-marital-status"
                  >
                    <option value="">Select</option>
                    <option value="Single">Single</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Stable Union">Stable Union</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Race/Ethnicity</label>
                  <select
                    name="race"
                    value={formData.race}
                    onChange={handleInputChange}
                    className="input-race"
                  >
                    <option value="">Select</option>
                    <option value="White">White</option>
                    <option value="Black">Black</option>
                    <option value="Brown">Brown</option>
                    <option value="Yellow">Yellow</option>
                    <option value="Indigenous">Indigenous</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Nationality</label>
                  <input
                    type="text"
                    name="nationality"
                    value={formData.nationality}
                    onChange={handleInputChange}
                    className="input-nationality"
                  />
                </div>
                <div className="form-group">
                  <label>Naturality</label>
                  <input
                    type="text"
                    name="naturality"
                    value={formData.naturality}
                    onChange={handleInputChange}
                    className="input-naturality"
                  />
                </div>
                <div className="form-group">
                  <label>Education</label>
                  <select
                    name="education"
                    value={formData.education}
                    onChange={handleInputChange}
                    className="input-education"
                  >
                    <option value="">Select</option>
                    <option value="Incomplete Elementary School">Incomplete Elementary School</option>
                    <option value="Complete Elementary School">Complete Elementary School</option>
                    <option value="Incomplete High School">Incomplete High School</option>
                    <option value="Complete High School">Complete High School</option>
                    <option value="Incomplete College">Incomplete College</option>
                    <option value="Complete College">Complete College</option>
                    <option value="Postgraduate">Postgraduate</option>
                    <option value="Master">Master</option>
                    <option value="Doctorate">Doctorate</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ID (RG)</label>
                  <input
                    type="text"
                    name="rg"
                    value={formData.rg}
                    onChange={handleInputChange}
                    className="input-rg"
                  />
                </div>
                <div className="form-group">
                  <label>CPF</label>
                  <IMaskInput
                    mask="000.000.000-00"
                    value={formData.cpf}
                    onAccept={(value) => setFormData((prev) => ({ ...prev, cpf: value }))}
                    placeholder="123.456.789-00"
                    className="input-cpf"
                  />
                </div>
                <div className="form-group">
                  <label>PIS</label>
                  <input
                    type="text"
                    name="pis"
                    value={formData.pis}
                    onChange={handleInputChange}
                    className="input-pis"
                  />
                </div>
                <div className="form-group">
                  <label>First Job</label>
                  <select name="firstJob" value={formData.firstJob} onChange={handleInputChange} className="input-first-job">
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>RNE (If Foreigner)</label>
                  <input
                    type="text"
                    name="rne"
                    value={formData.rne}
                    onChange={handleInputChange}
                    className="input-rne"
                  />
                </div>
                <div className="form-group">
                  <label>Validity</label>
                  <IMaskInput
                    mask="00/00/0000"
                    value={formData.rneValidity}
                    onAccept={(value) => setFormData((prev) => ({ ...prev, rneValidity: value }))}
                    placeholder="DD/MM/YYYY"
                    className="input-rne-validity"
                  />
                </div>
                <div className="form-group">
                  <label>Visa Type</label>
                  <input
                    type="text"
                    name="visaType"
                    value={formData.visaType}
                    onChange={handleInputChange}
                    className="input-visa-type"
                  />
                </div>
              </div>
  
              <div className="section-title">Employer Details</div>
              <div className="form-row">
                <div className="form-group">
                  <label>Contract Type</label>
                  <select
                    name="contractType"
                    value={formData.contractType}
                    onChange={handleInputChange}
                    className="input-contract-type"
                  >
                    <option value="Employee/CLT">Employee/CLT</option>
                    <option value="Freelancer">Freelancer</option>
                    <option value="Domestic">Domestic</option>
                    <option value="Partner">Partner</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Admission Date</label>
                  <IMaskInput
                    mask="00/00/0000"
                    value={formData.admissionDate}
                    onAccept={(value) => setFormData((prev) => ({ ...prev, admissionDate: value }))}
                    placeholder="DD/MM/YYYY"
                    className="input-admission-date"
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input
                    type="text"
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    className="input-role"
                  />
                </div>
                <div className="form-group">
                  <label>Salary</label>
                  <IMaskInput
                    mask="R$ num"
                    blocks={{
                      num: {
                        mask: Number,
                        thousandsSeparator: '.',
                        scale: 2,
                        padFractionalZeros: true,
                        normalizeZeros: true,
                        radix: ',',
                      },
                    }}
                    value={formData.salary}
                    onAccept={(value) => setFormData((prev) => ({ ...prev, salary: value }))}
                    placeholder="R$ 0,00"
                    className="input-salary"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Trial Period 1</label>
                  <input
                    type="text"
                    name="trialPeriod1"
                    value={formData.trialPeriod1}
                    readOnly
                    className="input-trial-period"
                  />
                </div>
                <div className="form-group">
                  <label>Trial Period 2</label>
                  <input
                    type="text"
                    name="trialPeriod2"
                    value={formData.trialPeriod2}
                    readOnly
                    className="input-trial-period"
                  />
                </div>
                <div className="form-group">
                  <label>Start Time</label>
                  <input
                    type="time"
                    name="workScheduleStart"
                    value={formData.workScheduleStart}
                    onChange={handleInputChange}
                    className="input-time"
                  />
                </div>
                <div className="form-group">
                  <label>End Time</label>
                  <input
                    type="time"
                    name="workScheduleEnd"
                    value={formData.workScheduleEnd}
                    onChange={handleInputChange}
                    className="input-time"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Advance</label>
                  <select name="advance" value={formData.advance} onChange={handleInputChange} className="input-advance">
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Break Duration (hours)</label>
                  <input
                    type="text"
                    name="breakDuration"
                    value={formData.breakDuration}
                    onChange={handleInputChange}
                    className="input-break-duration"
                  />
                </div>
                <div className="form-group">
                  <label>Break Start</label>
                  <input
                    type="time"
                    name="breakStart"
                    value={formData.breakStart}
                    onChange={handleInputChange}
                    className="input-time"
                  />
                </div>
                <div className="form-group">
                  <label>Break End</label>
                  <input
                    type="time"
                    name="breakEnd"
                    value={formData.breakEnd}
                    onChange={handleInputChange}
                    className="input-time"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group full-width">
                  <label>Days Off</label>
                  <input
                    type="text"
                    name="daysOff"
                    value={formData.daysOff}
                    onChange={handleInputChange}
                    className="input-days-off"
                  />
                </div>
              </div>
  
              <div className="section-title">Brands</div>
              <div className="form-row">
                <div className="form-group">
                  <label className="brand-label">
                    <img src={b2HiveLogo} alt="b2Hive" title="b2Hive" className="brand-logo" />
                    <input
                      type="checkbox"
                      checked={formData.brands.b2Hive}
                      onChange={(e) => handleBrandChange('b2Hive', e.target.checked)}
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label className="brand-label">
                    <img src={exnieLogo} alt="exnie" title="Exnie" className="brand-logo" />
                    <input
                      type="checkbox"
                      checked={formData.brands.exnie}
                      onChange={(e) => handleBrandChange('exnie', e.target.checked)}
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label className="brand-label">
                    <img src={fundsCapLogo} alt="fundsCap" title="FundsCap" className="brand-logo" />
                    <input
                      type="checkbox"
                      checked={formData.brands.fundsCap}
                      onChange={(e) => handleBrandChange('fundsCap', e.target.checked)}
                    />
                  </label>
                </div>
                <div className="form-group">
                  <label className="brand-label">
                    <img src={onEquityLogo} alt="onEquity" title="OnEquity" className="brand-logo" />
                    <input
                      type="checkbox"
                      checked={formData.brands.onEquity}
                      onChange={(e) => handleBrandChange('onEquity', e.target.checked)}
                    />
                  </label>
                </div>
              </div>
  
              {formData.isDismissalPopupOpen && (
                <div>
                  <div className="section-title">Dismissal Process</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Dismissal Date</label>
                      <IMaskInput
                        mask="00/00/0000"
                        value={formData.dismissalDate}
                        onAccept={(value) => {
                          setFormData((prev) => ({
                            ...prev,
                            dismissalDate: value,
                            homologationDate: calculateHomologationDate(value),
                          }));
                          setIsFormDirty(true);
                        }}
                        placeholder="DD/MM/YYYY"
                        className="input-admission-date"
                      />
                    </div>
                    <div className="form-group">
                      <label>Homologation Date</label>
                      <input
                        type="text"
                        value={formData.homologationDate}
                        readOnly
                        className="input-admission-date"
                      />
                    </div>
                  </div>
                  <div className="checkbox-list">
                    <ul className="checkbox-column">
                      <li className="checkbox-item">
                        <input
                          type="checkbox"
                          name="dismissalProcess.corporateCommunication"
                          checked={formData.dismissalProcess.corporateCommunication}
                          onChange={handleCheckboxChange}
                        />
                        <span className="checkbox-label">Corporate Communication</span>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={copyCorporateCommunication}
                          title="Copy Corporate Communication"
                        >
                          <i className="fas fa-copy"></i> Copy
                        </button>
                      </li>
                      <li className="checkbox-item">
                        <input
                          type="checkbox"
                          name="dismissalProcess.hrCommunication"
                          checked={formData.dismissalProcess.hrCommunication}
                          onChange={handleCheckboxChange}
                        />
                        <span className="checkbox-label">HR Communication</span>
                        <button
                          type="button"
                          className="copy-btn"
                          onClick={copyHRCommunication}
                          title="Copy HR Communication"
                        >
                          <i className="fas fa-copy"></i> Copy
                        </button>
                      </li>
                      {formData.admissionDate &&
                        formData.dismissalDate &&
                        calculateDaysDifference(formData.admissionDate, formData.dismissalDate) > 90 && (
                          <>
                            <li className="checkbox-item">
                              <input
                                type="checkbox"
                                name="dismissalProcess.dismissalExam"
                                checked={formData.dismissalProcess.dismissalExam}
                                onChange={handleCheckboxChange}
                              />
                              <span className="checkbox-label">Dismissal Exam</span>
                              <a
                                href="https://centralcliente.proocupacional.com.br/AutorizacaoExameMedico"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="copy-btn"
                                style={{ backgroundColor: '#3498db', marginLeft: '10px' }}
                              >
                                Request Exam
                              </a>
                            </li>
                            <li className="checkbox-item">
                              <input
                                type="checkbox"
                                name="dismissalProcess.examGuidePrinted"
                                checked={formData.dismissalProcess.examGuidePrinted}
                                onChange={handleCheckboxChange}
                              />
                              <span className="checkbox-label">Exam Guide Printed</span>
                            </li>
                          </>
                        )}
                      <li className="checkbox-item">
                        <input
                          type="checkbox"
                          name="dismissalProcess.employeeNotice"
                          checked={formData.dismissalProcess.employeeNotice}
                          onChange={handleCheckboxChange}
                        />
                        <span className="checkbox-label">Employee Notice with Notice</span>
                      </li>
                      <li className="checkbox-item">
                        <input
                          type="checkbox"
                          name="dismissalProcess.hrHomologationDocs"
                          checked={formData.dismissalProcess.hrHomologationDocs}
                          onChange={handleCheckboxChange}
                        />
                        <span className="checkbox-label">HR Homologation Documents</span>
                      </li>
                    </ul>
                    <ul className="checkbox-column">
                      <li className="checkbox-item">
                        <input
                          type="checkbox"
                          name="dismissalProcess.printedHomologationDocs"
                          checked={formData.dismissalProcess.printedHomologationDocs}
                          onChange={handleCheckboxChange}
                        />
                        <span className="checkbox-label">Printed Homologation Documents</span>
                      </li>
                      <li className="checkbox-item">
                        <input
                          type="checkbox"
                          name="dismissalProcess.debtorPayment"
                          checked={formData.dismissalProcess.debtorPayment}
                          onChange={handleCheckboxChange}
                        />
                        <span className="checkbox-label">Debtor Payment</span>
                      </li>
                      <li className="checkbox-item">
                        <input
                          type="checkbox"
                          name="dismissalProcess.managerSignature"
                          checked={formData.dismissalProcess.managerSignature}
                          onChange={handleCheckboxChange}
                        />
                        <span className="checkbox-label">Manager Signature</span>
                      </li>
                      <li className="checkbox-item">
                        <input
                          type="checkbox"
                          name="dismissalProcess.employeeSignature"
                          checked={formData.dismissalProcess.employeeSignature}
                          onChange={handleCheckboxChange}
                        />
                        <span className="checkbox-label">Employee Signature</span>
                      </li>
                    </ul>
                  </div>
                  <div className="buttons" style={{ marginTop: '20px' }}>
                    <button
                      type="button"
                      onClick={finalizeDismissal}
                      disabled={!Object.values(formData.dismissalProcess).every((checked) => checked)}
                    >
                      Finalize Process
                    </button>
                  </div>
                </div>
              )}
  
              <div className="buttons">
                <button type="submit">Save</button>
                <button type="button" onClick={closePopup}>Cancel</button>
                <button
                  type="button"
                  onClick={downloadAdmissionForm}
                  disabled={!isFormComplete()}
                >
                  Download Admission Form
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
  
      {showSuccessPopup && (
        <div className="success-popup">
          <p>Employee saved successfully!</p>
          <button onClick={() => setShowSuccessPopup(false)}>OK</button>
        </div>
      )}
    </div>
  );
}

// Função auxiliar para calcular a diferença de dias entre duas datas
const calculateDaysDifference = (startDate, endDate) => {
  const [startDay, startMonth, startYear] = startDate.split('/');
  const [endDay, endMonth, endYear] = endDate.split('/');
  const start = new Date(`${startYear}-${startMonth}-${startDay}`);
  const end = new Date(`${endYear}-${endMonth}-${endDay}`);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export default Team;