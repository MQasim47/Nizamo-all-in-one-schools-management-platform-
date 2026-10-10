import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import {
  findActiveSchool,
  findActiveUser,
  isLoginLocked,
  loginIdentifier,
  recordLoginAttempt,
} from '@/lib/db/admin/auth'
import { loginSchema } from '@/lib/validation/auth'

// A real bcrypt hash, compared when the account does not exist so that
// "unknown email" and "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10)

export const SESSION_MAX_AGE = 24 * 60 * 60 // 24 hours

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        subdomain: { label: 'School Subdomain', type: 'text' },
      },

      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials)
        if (!parsed.success) return null
        const { email, password, subdomain } = parsed.data

        const identifier = loginIdentifier(subdomain, email)

        // Lock after 5 consecutive failures for 15 minutes. The message is read by the login page.
        if (await isLoginLocked(identifier)) throw new Error('LOCKED')

        const school = await findActiveSchool(subdomain)
        const user = school ? await findActiveUser(school.id, email) : null

        const isValid = await bcrypt.compare(password, user?.password_hash || DUMMY_HASH)
        if (!school || !user || !isValid) {
          await recordLoginAttempt(identifier, false)
          return null
        }

        await recordLoginAttempt(identifier, true)

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          schoolId: school.id,
          schoolName: school.school_name,
          schoolSubdomain: school.subdomain,
          schoolPlan: school.plan,
          isFirstLogin: user.is_first_login,
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.schoolId = user.schoolId
        token.schoolName = user.schoolName
        token.schoolSubdomain = user.schoolSubdomain
        token.schoolPlan = user.schoolPlan
        token.isFirstLogin = user.isFirstLogin
      }
      return token
    },

    async session({ session, token }) {
      session.user.id = token.id
      session.user.role = token.role
      session.user.schoolId = token.schoolId
      session.user.schoolName = token.schoolName
      session.user.schoolSubdomain = token.schoolSubdomain
      session.user.schoolPlan = token.schoolPlan
      session.user.isFirstLogin = token.isFirstLogin
      return session
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  // The token itself is only a 24h ticket. Whether the user is STILL allowed in (active user,
  // active school, current role) is re-checked on every server request in lib/auth/session.js.
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
  },

  secret: process.env.NEXTAUTH_SECRET,
}
