import axios, { type InternalAxiosRequestConfig } from 'axios'

export const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
})

apiClient.interceptors.request.use((config) => {
    const token = sessionStorage.getItem('access_token')

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

type RetriableRequestConfig = InternalAxiosRequestConfig & {
    _retry?: boolean
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config as RetriableRequestConfig | undefined
        const refreshToken = sessionStorage.getItem('refresh_token')
        const isAuthRequest = originalRequest?.url?.includes('/auth/')

        if (error.response?.status === 401 && !refreshToken && !isAuthRequest) {
            sessionStorage.removeItem('access_token')
            window.location.href = '/'
        }

        if (
            error.response?.status !== 401 ||
            !originalRequest ||
            originalRequest._retry ||
            !refreshToken ||
            isAuthRequest
        ) {
            return Promise.reject(error)
        }

        originalRequest._retry = true

        try {
            const response = await axios.post<{ access: string }>(
                `${apiClient.defaults.baseURL}/auth/refresh/`,
                { refresh: refreshToken },
            )

            sessionStorage.setItem('access_token', response.data.access)
            originalRequest.headers.Authorization = `Bearer ${response.data.access}`

            return apiClient(originalRequest)
        } catch (refreshError) {
            sessionStorage.removeItem('access_token')
            sessionStorage.removeItem('refresh_token')
            window.location.href = '/'

            return Promise.reject(refreshError)
        }
    },
)
