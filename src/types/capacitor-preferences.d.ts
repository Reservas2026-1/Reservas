declare module '@capacitor/preferences' {
  export interface SetOptions {
    key: string
    value: string
  }
  export interface GetOptions {
    key: string
  }
  export interface GetResult {
    value: string | null
  }
  export interface RemoveOptions {
    key: string
  }
  export const Preferences: {
    set(options: SetOptions): Promise<void>
    get(options: GetOptions): Promise<GetResult>
    remove(options: RemoveOptions): Promise<void>
    clear(): Promise<void>
  }
}
