import { requestJson } from '../../lib/api'

export interface AiAdminRuntimePayload {
  runtime: {
    is_enabled: boolean
    default_provider_config_id: number | null
    default_model_id: number | null
    assistant_name: string
    system_prompt: string
  }
  providers: AiAdminProvider[]
  models: AiAdminModel[]
}

export interface AiAdminProvider {
  id: number
  provider_key: string
  display_name: string
  provider_type: string
  base_url?: string
  api_key?: string
  is_enabled: boolean
  supports_model_sync?: boolean
}

export interface AiAdminModel {
  id: number
  provider_config_id: number
  provider_name?: string
  display_name: string
  model_id: string
  supports_vision: boolean
  supports_json_output: boolean
  is_enabled: boolean
  is_default: boolean
}

export interface AiAdminRuntimeUpdatePayload {
  is_enabled?: boolean
  default_provider_config_id?: number | null
  default_model_id?: number | null
  assistant_name?: string
  system_prompt?: string
}

export function fetchAiAdminRuntime(accessToken: string) {
  return requestJson<AiAdminRuntimePayload>('/admin/ai/runtime', { method: 'GET' }, accessToken)
}

export function saveAiAdminRuntime(accessToken: string, payload: AiAdminRuntimeUpdatePayload) {
  return requestJson<{ saved: boolean } & AiAdminRuntimePayload>(
    '/admin/ai/runtime',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    accessToken,
  )
}

export function saveAiAdminProvider(
  accessToken: string,
  payload: {
    provider_id?: number
    provider_key: string
    display_name: string
    provider_type: string
    base_url?: string
    api_key?: string
    is_enabled?: boolean
    supports_model_sync?: boolean
  },
) {
  return requestJson<{ saved: boolean; providers: AiAdminProvider[] }>(
    '/admin/ai/providers',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    accessToken,
  )
}

export function saveAiAdminModel(
  accessToken: string,
  payload: {
    provider_config_id: number
    model_id?: number
    remote_model_id: string
    display_name: string
    supports_vision?: boolean
    supports_json_output?: boolean
    is_enabled?: boolean
    is_default?: boolean
  },
) {
  return requestJson<{ saved: boolean; models: AiAdminModel[] }>(
    '/admin/ai/models',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    accessToken,
  )
}
