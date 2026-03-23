import { requestJson } from '../../lib/api'

export interface OpenClawRuntimePayload {
  runtime: {
    config_version: string
    runtime: {
      is_enabled: boolean
      default_provider_config_id: number | null
      default_model_id: number | null
      notes: string | null
      discord_bot_token: string
      ai_chat: {
        is_enabled: boolean
        default_provider_config_id: number | null
        default_model_id: number | null
        assistant_name: string
        system_prompt: string
      }
    }
    providers: OpenClawProvider[]
    models: OpenClawModel[]
    channels: Array<{
      id: number
      guild_id: string
      channel_id: string
      is_enabled: boolean
    }>
    pending_reload_request: {
      id: number
      status: string
      requested_at: string
    } | null
    runtime_status: {
      config_version_applied: string | null
      gateway_state: string
      discord_state: string
      discord_application_id: string | null
      last_heartbeat_at: string | null
      last_reload_at: string | null
    }
  }
  control_plane: {
    id: string
    config_version: string
    last_runtime_reload_requested_at: string | null
    last_runtime_reload_requested_by: string | null
    last_runtime_reload_reason: string | null
    updated_at: string
    last_runtime_reload_requested_by_name: string | null
  }
  runtime_status: {
    id: string
    gateway_state: string
    discord_state: string
    heartbeat_at: string | null
    last_reload_at: string | null
    last_error_message: string | null
    updated_at: string
  }
  pending_reload_request: {
    id: number
    status: string
    requested_at: string
  } | null
}

export interface OpenClawProvider {
  id: number
  provider_key: string
  display_name: string
  provider_type: string
  base_url?: string
  api_key?: string
  is_enabled: boolean
  supports_model_sync?: boolean
}

export interface OpenClawModel {
  id: number
  provider_config_id: number
  display_name: string
  model_id: string
  supports_vision: boolean
  supports_json_output: boolean
  is_enabled: boolean
  is_default: boolean
}

export interface OpenClawRuntimeUpdatePayload {
  is_enabled?: boolean
  discord_bot_token?: string
  default_provider_config_id?: number | null
  default_model_id?: number | null
  notes?: string
  ai_chat_enabled?: boolean
  ai_chat_default_provider_config_id?: number | null
  ai_chat_default_model_id?: number | null
  ai_chat_assistant_name?: string
  ai_chat_system_prompt?: string
}

export function fetchOpenClawRuntime(accessToken: string) {
  return requestJson<OpenClawRuntimePayload>('/admin/openclaw/runtime', { method: 'GET' }, accessToken)
}

export function saveOpenClawRuntime(accessToken: string, payload: OpenClawRuntimeUpdatePayload) {
  return requestJson<{ saved: boolean; runtime: OpenClawRuntimePayload['runtime'] }>(
    '/admin/openclaw/runtime',
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    },
    accessToken,
  )
}

export function requestOpenClawReload(accessToken: string) {
  return requestJson<{ reload_request_id: number; status: string }>(
    '/admin/openclaw/runtime/reload',
    {
      method: 'POST',
      body: JSON.stringify({ reason: 'mobileweb_manual_reload' }),
    },
    accessToken,
  )
}

export function saveOpenClawProvider(
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
  return requestJson<{ saved: boolean; providers: OpenClawProvider[] }>(
    '/admin/openclaw/providers',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    accessToken,
  )
}

export function saveOpenClawModel(
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
  return requestJson<{ saved: boolean; models: OpenClawModel[] }>(
    '/admin/openclaw/models',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    accessToken,
  )
}
