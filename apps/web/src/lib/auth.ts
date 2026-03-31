import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { db } from '@ecokuku/db';
import bcrypt from 'bcryptjs';
import { JWT } from 'next-auth/jwt';
import { Session } from 'next-auth';

interface CustomJWT extends JWT {
  role?: string;
  userId?: string;
}

interface CustomSession extends Session {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'email@example.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Invalid credentials');
        }

        try {
          const user = await db.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            throw new Error('User not found');
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password,
          );

          if (!passwordMatch) {
            throw new Error('Invalid password');
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw new Error('Authentication failed');
        }
      },
    }),
  ],

  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },

  callbacks: {
    async jwt({ token, user }: { token: CustomJWT; user?: any }) {
      if (user) {
        token.role = user.role;
        token.userId = user.id;
      }
      return token;
    },

    async session({ session, token }: { session: CustomSession; token: CustomJWT }) {
      if (session.user) {
        session.user.role = token.role || '';
        session.user.id = token.userId || '';
      }
      return session;
    },
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
};
