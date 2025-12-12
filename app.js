// Paste your Firebase configuration object here
const firebaseConfig = {
    apiKey: "AIzaSyAqM_BHrSnJmyyptcn-5poegiBe6lj9eI4",
    authDomain: "nzeru-ai.firebaseapp.com",
    projectId: "nzeru-ai",
    storageBucket: "nzeru-ai.firebasestorage.app",
    messagingSenderId: "591792791070",
    appId: "1:591792791070:web:47dc1b328506d24d7dd80f",
    measurementId: "G-DMQTV8TWX2"
  };
  
  // Initialize Firebase
  firebase.initializeApp(firebaseConfig);
  const auth = firebase.auth();
  const googleProvider = new firebase.auth.GoogleAuthProvider();
  
  // Function to handle redirection and UI updates based on auth state
  const handleAuthState = () => {
      auth.onAuthStateChanged(user => {
          const currentPage = window.location.pathname.split('/').pop();
  
          if (user) {
              // User is signed in.
              // If on the login page, redirect to the dashboard.
              if (currentPage === 'login.html' || currentPage === '') {
                  window.location.href = 'generator.html';
              } else if (currentPage === 'generator.html') {
                  // If on the dashboard, display user info.
                  const userEmailElement = document.getElementById('userEmail');
                  if (userEmailElement) {
                      userEmailElement.textContent = user.email;
                  }
              }
          } else {
              // No user is signed in.
              // If on the dashboard page, redirect to the login page.
              if (currentPage === 'generator.html') {
                  window.location.href = 'index.html';
              }
          }
      });
  };
  
  // Generic function to handle sign-in/sign-up errors
  const handleAuthError = (error) => {
      const errorMessageElement = document.getElementById('error-message');
      if (errorMessageElement) {
          errorMessageElement.textContent = error.message;
          console.error("Authentication Error:", error);
      }
  };
  
  // Event Listeners for Authentication actions (only on index.html)
  if (document.getElementById('signInBtn')) {
      // Sign-Up with Email and Password
      document.getElementById('signUpBtn').addEventListener('click', () => {
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          auth.createUserWithEmailAndPassword(email, password)
              .catch(handleAuthError);
      });
  
      // Sign-In with Email and Password
      document.getElementById('signInBtn').addEventListener('click', () => {
          const email = document.getElementById('email').value;
          const password = document.getElementById('password').value;
          auth.signInWithEmailAndPassword(email, password)
              .catch(handleAuthError);
      });
  
      // Sign-In with Google
      document.getElementById('googleSignInBtn').addEventListener('click', () => {
          auth.signInWithPopup(googleProvider)
              .catch(handleAuthError);
      });
  }
  
  // Event Listener for Sign-Out (only on dashboard.html)
  if (document.getElementById('logoutBtn')) {
      document.getElementById('logoutBtn').addEventListener('click', () => {
          auth.logout();
      });
  }
  
  // Initialize the auth state handler on page load
  handleAuthState();  

  