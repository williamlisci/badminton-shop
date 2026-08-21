import {type SubmitEvent, useState } from 'react'
import { login } from '../api/auth'
import { useNavigate } from 'react-router-dom'
import {useToastStore} from '../store/toastStore'

function LoginPage() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigate = useNavigate()
    const {show: showToast} = useToastStore()

    const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        setLoading(true)
        setError('')

        try {
            const data = await login(username, password)

            // Tạm lưu cho môi trường local.
            // Sau này sẽ chuyển sang httpOnly cookie khi hoàn thiện bảo mật.
            sessionStorage.setItem('access_token', data.access)
            sessionStorage.setItem('refresh_token', data.refresh)

            showToast('Đăng nhập thành công.')
            navigate('/dashboard')
        } catch {
            setError('Tên đăng nhập hoặc mật khẩu không đúng.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md bg-white p-8 rounded-xl shadow"
            >
                <h1 className="text-2xl font-bold text-slate-800 mb-6">
                    Đăng nhập quản trị
                </h1>

                {error && (
                    <p className="mb-4 text-red-600">
                        {error}
                    </p>
                )}

                <input
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Tên đăng nhập"
                    className="w-full border rounded-lg px-4 py-3 mb-4"
                />

                <input
                    required
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mật khẩu"
                    className="w-full border rounded-lg px-4 py-3 mb-6"
                />

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 disabled:bg-slate-300"
                >
                    {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
            </form>
        </div>
    )
}

export default LoginPage