import { useState } from 'react';
import Head from 'next/head';
import { register } from '@/services/auth';

export default function Register() {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        password: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isLoading, setIsLoading] = useState(false);

    // Client-side validation
    const validateEmail = (email) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus({ type: '', message: '' });

        // Basic validation
        if (!formData.name || !formData.username || !formData.email || !formData.password) {
            setStatus({ type: 'error', message: 'All fields are required' });
            return;
        }

        if (!validateEmail(formData.email)) {
            setStatus({ type: 'error', message: 'Please enter a valid email address' });
            return;
        }

        if (formData.password.length < 8) {
            setStatus({ type: 'error', message: 'Password must be at least 8 characters' });
            return;
        }

        setIsLoading(true);

        try {
            await register(formData);
            setStatus({ type: 'success', message: 'Registration successful! You can now log in.' });
            setFormData({ name: '', username: '', email: '', password: '' });
        } catch (error) {
            setStatus({ type: 'error', message: error.message || 'Registration failed. Please try again.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100-vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '20px' }}>
            <Head>
                <title>User Registration</title>
            </Head>

            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '400px', width: '100%' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>Create Account</h1>
                <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>Please fill in your details to register</p>

                {status.message && (
                    <div style={{
                        padding: '12px',
                        borderRadius: '6px',
                        marginBottom: '16px',
                        fontSize: '14px',
                        backgroundColor: status.type === 'success' ? '#ecfdf5' : '#fef2f2',
                        color: status.type === 'success' ? '#065f46' : '#991b1b',
                        border: `1px solid ${status.type === 'success' ? '#6ee7b7' : '#fecaca'}`
                    }}>
                        {status.message}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Full Name</label>
                        <input
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="John Doe"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', transition: 'border-color 0.2s' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Username</label>
                        <input
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder="johndoe123"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Email Address</label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="john@example.com"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>Password</label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder="••••••••"
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            marginTop: '8px',
                            padding: '12px',
                            backgroundColor: isLoading ? '#9ca3af' : '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: '600',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                    Already have an account? <a href="/login" style={{ color: '#2563eb', fontWeight: '500' }}>Login here</a>
                </div>
            </div>
        </div>
    );
}
