import {apiClient} from './client'

export interface AuditLog {
    id: number
    actor_name: string | null
    action: string
    action_display: string
    entity_type: string
    entity_id: string
    summary: string
    changes: Record<string, {before: unknown; after: unknown}>
    created_at: string
}

export interface AuditLogQuery {
    search?: string
    action?: string
    entity_type?: string
}

export const getAuditLogs = async (params: AuditLogQuery = {}): Promise<AuditLog[]> => {
    const response = await apiClient.get('/admin-audit-logs/', {params})
    return response.data.results ?? response.data
}
