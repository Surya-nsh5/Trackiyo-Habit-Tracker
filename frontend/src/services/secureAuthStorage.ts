import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

export interface StoredSession {
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number; // Unix ms
  rememberMe: boolean;
}

class SecureAuthStorageService {
  private inMemoryAccessToken: string | null = null;
  private inMemoryRefreshToken: string | null = null;
  private inMemoryTokenExpiry: number = 0;
  private inMemoryRememberMe: boolean = true;
  private initialized: boolean = false;

  public isNative(): boolean {
    return typeof window !== 'undefined' && Capacitor.isNativePlatform();
  }

  /**
   * Initializes session from storage.
   * On native Android: reads from hardware-encrypted Keystore (SecureStorage).
   * On web: reads from localStorage (if rememberMe) or sessionStorage.
   */
  public async init(): Promise<StoredSession | null> {
    if (this.initialized && this.inMemoryAccessToken) {
      return {
        accessToken: this.inMemoryAccessToken,
        refreshToken: this.inMemoryRefreshToken || '',
        tokenExpiry: this.inMemoryTokenExpiry,
        rememberMe: this.inMemoryRememberMe,
      };
    }
    this.initialized = true;

    try {
      if (this.isNative()) {
        const [accessToken, refreshToken, tokenExpiryStr, rememberMeStr] = await Promise.all([
          SecureStorage.getItem('auth_access_token').catch(() => null),
          SecureStorage.getItem('auth_refresh_token').catch(() => null),
          SecureStorage.getItem('auth_token_expiry').catch(() => null),
          SecureStorage.getItem('auth_remember_me').catch(() => null),
        ]);

        if (accessToken) {
          this.inMemoryAccessToken = accessToken;
          this.inMemoryRefreshToken = refreshToken;
          this.inMemoryTokenExpiry = tokenExpiryStr ? parseInt(tokenExpiryStr, 10) : 0;
          this.inMemoryRememberMe = rememberMeStr !== 'false';

          return {
            accessToken,
            refreshToken: refreshToken || '',
            tokenExpiry: this.inMemoryTokenExpiry,
            rememberMe: this.inMemoryRememberMe,
          };
        }
      } else {
        // Web: check localStorage first, then sessionStorage
        let accessToken = localStorage.getItem('access_token');
        let refreshToken = localStorage.getItem('refresh_token');
        let tokenExpiryStr = localStorage.getItem('token_expiry');
        let rememberMe = true;

        if (!accessToken) {
          accessToken = sessionStorage.getItem('access_token');
          refreshToken = sessionStorage.getItem('refresh_token');
          tokenExpiryStr = sessionStorage.getItem('token_expiry');
          rememberMe = false;
        }

        if (accessToken) {
          this.inMemoryAccessToken = accessToken;
          this.inMemoryRefreshToken = refreshToken;
          this.inMemoryTokenExpiry = tokenExpiryStr ? parseInt(tokenExpiryStr, 10) : 0;
          this.inMemoryRememberMe = rememberMe;

          return {
            accessToken,
            refreshToken: refreshToken || '',
            tokenExpiry: this.inMemoryTokenExpiry,
            rememberMe,
          };
        }
      }
    } catch (e) {
      console.warn('Could not restore secure session:', e);
    }

    return null;
  }

  public getAccessToken(): string | null {
    return this.inMemoryAccessToken;
  }

  public getRefreshToken(): string | null {
    return this.inMemoryRefreshToken;
  }

  public isExpired(): boolean {
    if (!this.inMemoryTokenExpiry) return true;
    return Date.now() >= this.inMemoryTokenExpiry;
  }

  public async saveSession(
    accessToken: string,
    refreshToken: string,
    expiresIn: number,
    rememberMe: boolean = true
  ): Promise<void> {
    const expiry = Date.now() + (expiresIn - 60) * 1000;
    this.inMemoryAccessToken = accessToken;
    this.inMemoryRefreshToken = refreshToken;
    this.inMemoryTokenExpiry = expiry;
    this.inMemoryRememberMe = rememberMe;

    if (this.isNative()) {
      if (rememberMe) {
        await Promise.all([
          SecureStorage.setItem('auth_access_token', accessToken),
          SecureStorage.setItem('auth_refresh_token', refreshToken),
          SecureStorage.setItem('auth_token_expiry', String(expiry)),
          SecureStorage.setItem('auth_remember_me', 'true'),
        ]);
      } else {
        // If rememberMe is false, clear hardware storage so closing app forgets session
        await Promise.all([
          SecureStorage.removeItem('auth_access_token').catch(() => {}),
          SecureStorage.removeItem('auth_refresh_token').catch(() => {}),
          SecureStorage.removeItem('auth_token_expiry').catch(() => {}),
          SecureStorage.removeItem('auth_remember_me').catch(() => {}),
        ]);
      }
      // Guarantee plain localStorage has no credentials on native Android
      try {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiry');
      } catch {}
    } else {
      // Web platform
      if (rememberMe) {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        localStorage.setItem('token_expiry', String(expiry));
        sessionStorage.removeItem('access_token');
        sessionStorage.removeItem('refresh_token');
        sessionStorage.removeItem('token_expiry');
      } else {
        sessionStorage.setItem('access_token', accessToken);
        sessionStorage.setItem('refresh_token', refreshToken);
        sessionStorage.setItem('token_expiry', String(expiry));
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('token_expiry');
      }
    }
  }

  public async clearSession(): Promise<void> {
    this.inMemoryAccessToken = null;
    this.inMemoryRefreshToken = null;
    this.inMemoryTokenExpiry = 0;

    if (this.isNative()) {
      try {
        await Promise.all([
          SecureStorage.removeItem('auth_access_token').catch(() => {}),
          SecureStorage.removeItem('auth_refresh_token').catch(() => {}),
          SecureStorage.removeItem('auth_token_expiry').catch(() => {}),
          SecureStorage.removeItem('auth_remember_me').catch(() => {}),
        ]);
      } catch {}
    }

    try {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('token_expiry');
      sessionStorage.removeItem('access_token');
      sessionStorage.removeItem('refresh_token');
      sessionStorage.removeItem('token_expiry');
    } catch {}
  }
}

export const secureAuthStorage = new SecureAuthStorageService();
