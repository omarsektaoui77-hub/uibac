// Firebase Authentication Middleware
// Secure JWT-based authentication with proper validation

import { auth } from '@/app/lib/firebase';
import { DecodedIdToken } from 'firebase-admin/auth';
import { NextRequest } from 'next/server';

export interface AuthenticatedUser {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  photoURL?: string;
  customClaims?: Record<string, any>;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  code?: 'UNAUTHORIZED' | 'INVALID_TOKEN' | 'EXPIRED_TOKEN' | 'MISSING_TOKEN';
}

/**
 * Firebase Authentication Middleware
 * Validates JWT tokens and extracts user information
 */
export class FirebaseAuthMiddleware {
  /**
   * Authenticate user from request
   */
  static async authenticate(request: NextRequest): Promise<AuthResult> {
    try {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return {
          success: false,
          error: 'Missing or invalid authorization header',
          code: 'MISSING_TOKEN'
        };
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Verify token with Firebase Admin SDK
      const decodedToken = await auth.verifyIdToken(token, true); // checkRevoked = true
      
      // Validate token structure
      const user = this.validateAndExtractUser(decodedToken);
      
      return {
        success: true,
        user
      };

    } catch (error) {
      console.error('Authentication error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('id-token-expired')) {
          return {
            success: false,
            error: 'Token expired',
            code: 'EXPIRED_TOKEN'
          };
        }
        
        if (error.message.includes('id-token-revoked')) {
          return {
            success: false,
            error: 'Token revoked',
            code: 'INVALID_TOKEN'
          };
        }
        
        if (error.message.includes('argument-error')) {
          return {
            success: false,
            error: 'Invalid token format',
            code: 'INVALID_TOKEN'
          };
        }
      }

      return {
        success: false,
        error: 'Authentication failed',
        code: 'UNAUTHORIZED'
      };
    }
  }

  /**
   * Validate and extract user information from decoded token
   */
  private static validateAndExtractUser(decodedToken: DecodedIdToken): AuthenticatedUser {
    // Ensure required fields are present
    if (!decodedToken.uid || !decodedToken.email) {
      throw new Error('Invalid token: missing required fields');
    }

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified || false,
      displayName: decodedToken.name,
      photoURL: decodedToken.picture,
      customClaims: decodedToken.customClaims || {}
    };
  }

  /**
   * Check if user has required role/permission
   */
  static hasPermission(user: AuthenticatedUser, permission: string): boolean {
    if (!user.customClaims) return false;
    
    const roles = user.customClaims.roles || [];
    const permissions = user.customClaims.permissions || [];
    
    return roles.includes('admin') || permissions.includes(permission);
  }

  /**
   * Check if user is premium
   */
  static isPremium(user: AuthenticatedUser): boolean {
    return user.customClaims?.subscription?.tier === 'premium' || 
           user.customClaims?.isPremium === true;
  }

  /**
   * Get user subscription tier
   */
  static getSubscriptionTier(user: AuthenticatedUser): 'free' | 'basic' | 'premium' {
    return user.customClaims?.subscription?.tier || 'free';
  }
}

/**
 * Higher-order function to protect API routes
 */
export function withAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return async (request: NextRequest): Promise<Response> => {
    const authResult = await FirebaseAuthMiddleware.authenticate(request);
    
    if (!authResult.success || !authResult.user) {
      return new Response(
        JSON.stringify({
          error: authResult.error,
          code: authResult.code
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': 'Bearer'
          }
        }
      );
    }

    return handler(request, authResult.user);
  };
}

/**
 * Higher-order function for admin-only routes
 */
export function withAdminAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return withAuth(async (request: NextRequest, user: AuthenticatedUser): Promise<Response> => {
    if (!FirebaseAuthMiddleware.hasPermission(user, 'admin_access')) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient permissions',
          code: 'FORBIDDEN'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request, user);
  });
}

/**
 * Higher-order function for premium-only routes
 */
export function withPremiumAuth(handler: (request: NextRequest, user: AuthenticatedUser) => Promise<Response>) {
  return withAuth(async (request: NextRequest, user: AuthenticatedUser): Promise<Response> => {
    if (!FirebaseAuthMiddleware.isPremium(user)) {
      return new Response(
        JSON.stringify({
          error: 'Premium subscription required',
          code: 'PREMIUM_REQUIRED'
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return handler(request, user);
  });
}

/**
 * Rate limiting based on user tier
 */
export function getRateLimitForUser(user: AuthenticatedUser): {
  requests: number;
  window: number; // seconds
} {
  const tier = FirebaseAuthMiddleware.getSubscriptionTier(user);
  
  switch (tier) {
    case 'premium':
      return { requests: 1000, window: 3600 }; // 1000 requests/hour
    case 'basic':
      return { requests: 500, window: 3600 };  // 500 requests/hour
    case 'free':
    default:
      return { requests: 100, window: 3600 }; // 100 requests/hour
  }
}

/**
 * Extract user ID from request (for logging and debugging)
 */
export function extractUserId(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    // For logging purposes, we can extract the UID without full verification
    const token = authHeader.substring(7);
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.uid || null;
  } catch {
    return null;
  }
}

export default FirebaseAuthMiddleware;
