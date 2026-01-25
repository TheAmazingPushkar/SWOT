// Import Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

// --- CONFIGURATION ---
const SUPABASE_URL = 'https://whrqospobphrijztyptg.supabase.co'
const SUPABASE_KEY = 'sb_publishable_JDI1sk1Wu1NIAc_nbDIk2w_64oAuV-I'
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// --- 1. PROTECTED PAGE LOGIC (The Bouncer) ---
// If the user is on 'home.html', check if they are logged in.
if (window.location.pathname.includes('home.html')) {
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
        // User is not logged in, kick them back to login
        window.location.href = 'login.html'
    }
}

// --- 2. SIGNUP LOGIC ---
const signupForm = document.getElementById('signup-form')
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = document.getElementById('email').value.trim()
        const username = document.getElementById('new-user').value.trim()
        const password = document.getElementById('new-pass').value
        const confirm = document.getElementById('confirm-password').value
        const msgEl = document.getElementById('signup-message')

        if (msgEl) msgEl.textContent = ''

        if (!email || !username || !password) {
            if (msgEl) msgEl.textContent = 'Please fill out all fields.'
            return
        }

        if (password !== confirm) {
            if (msgEl) msgEl.textContent = 'Passwords do not match.'
            return
        }

        const submitBtn = signupForm.querySelector('button[type="submit"]')
        if (submitBtn) submitBtn.disabled = true

        const { data, error } = await supabase.auth.signUp({ email, password })

        if (submitBtn) submitBtn.disabled = false

        if (error) {
            if (msgEl) msgEl.textContent = error.message
            else alert(error.message)
        } else {
            if (msgEl) msgEl.textContent = 'Check your email for the confirmation link!'
            else alert('Check your email for the confirmation link!')
        }
    })
}

// --- 3. LOGIN LOGIC ---
const loginForm = document.getElementById('login-form')
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()
        const email = document.getElementById('email').value
        const password = document.getElementById('password').value

        const { data, error } = await supabase.auth.signInWithPassword({ email, password })

        if (error) {
            alert(error.message)
        } else {
            // SUCCESS: Send them to the home page
            window.location.href = 'home.html' 
        }
    })
}

// --- 4. LOGOUT LOGIC ---
// Add a button with id="logout-btn" to your home.html
const logoutBtn = document.getElementById('logout-btn')
if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
        await supabase.auth.signOut()
        window.location.href = 'index.html' // Go back to landing page
    })

}


