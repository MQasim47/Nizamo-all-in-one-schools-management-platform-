import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { supabaseAdmin } from './supabase'

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
        const { email, password, subdomain } = credentials

        if (!email || !password || !subdomain) return null

        // 1. Find the school by subdomain
        const { data: school, error: schoolError } = await supabaseAdmin
          .from('schools')
          .select('*')
          .eq('subdomain', subdomain)
          .eq('status', 'active')
          .single()

        if (schoolError || !school) return null

        // 2. Find the user in that school
        const { data: user, error: userError } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('email', email)
          .eq('school_id', school.id)
          .eq('status', 'active')
          .single()

        if (userError || !user) return null

        // 3. Verify password
        const isValid = await bcrypt.compare(password, user.password_hash)
        if (!isValid) return null

        // 4. Return user object — stored in the JWT session
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

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  secret: process.env.NEXTAUTH_SECRET,
}
