import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { register } from '@/services/auth';
import enMessages from '@/messages/en.json';
import faMessages from '@/messages/fa.json';

const MESSAGES = { en: enMessages, fa: faMessages };
const getLocaleFromPath = (path) => (path && path.startsWith('/fa') ? 'fa' : 'en');
const getMessage = (messages, key) => key.split('.').reduce((acc, part) => (acc ? acc[part] : undefined), messages);
const formatMessage = (template, values = {}) =>
  String(template || '').replace(/\{(\w+)\}/g, (_, k) => (values[k] !== undefined ? String(values[k]) : `{${k}}`));

export default function Register() {
    const router = useRouter();
    const locale = getLocaleFromPath(router.asPath || '');
    const messages = MESSAGES[locale] || MESSAGES.en;
    const t = (key, values) => formatMessage(getMessage(messages, key) || key, values);
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
            setStatus({ type: 'error', message: t('register.errors.allFieldsRequired') });
            return;
        }

        if (!validateEmail(formData.email)) {
            setStatus({ type: 'error', message: t('register.errors.invalidEmail') });
            return;
        }

        if (formData.password.length < 8) {
            setStatus({ type: 'error', message: t('register.errors.passwordTooShort') });
            return;
        }

        setIsLoading(true);

        try {
            await register(formData);
            setStatus({ type: 'success', message: t('register.success') });
            setFormData({ name: '', username: '', email: '', password: '' });
        } catch (error) {
            setStatus({ type: 'error', message: error.message || t('register.errors.failed') });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100-vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3f4f6', padding: '20px' }}>
            <Head>
                <title>{t('register.headTitle')}</title>
            </Head>

            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)', maxWidth: '400px', width: '100%' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', textAlign: 'center' }}>{t('register.title')}</h1>
                <p style={{ color: '#6b7280', fontSize: '14px', textAlign: 'center', marginBottom: '24px' }}>{t('register.subtitle')}</p>

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
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>{t('register.fields.fullName')}</label>
                        <input
                            name="name"
                            type="text"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder={t('register.placeholders.fullName')}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', transition: 'border-color 0.2s' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>{t('register.fields.username')}</label>
                        <input
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            placeholder={t('register.placeholders.username')}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>{t('register.fields.email')}</label>
                        <input
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder={t('register.placeholders.email')}
                            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none' }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '4px' }}>{t('register.fields.password')}</label>
                        <input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleChange}
                            placeholder={t('register.placeholders.password')}
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
                        {isLoading ? t('register.registering') : t('register.submit')}
                    </button>
                </form>

                <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
                    {t('register.haveAccount')}{' '}
                    <Link href="/login" style={{ color: '#2563eb', fontWeight: '500' }}>{t('register.loginHere')}</Link>
                </div>
            </div>
        </div>
    );
}
