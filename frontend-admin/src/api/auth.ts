import { apiClient } from './client'

interface LoginResponse {
    access: string
    refresh: string
}

export const login = async (username: string, password: string) => {
    const response = await apiClient.post<LoginResponse>(
        '/auth/login/',
        {
            username,
            password,
        },
    )

    return response.data
}