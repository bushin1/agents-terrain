import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import { ADMIN_DOMAIN, isAllowedAdmin } from '@/lib/admin-access'
import { authorizeAgentOtp } from '@/modules/recruitment'

// Deux populations, deux portes : l'équipe par Google Workspace (domaine + liste AdminUser),
// les agents par code SMS. Le rôle d'un admin est relu en base à chaque page (lib/session.ts).
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  session: { strategy: 'jwt', maxAge: 30 * 24 * 3600 },
  // Un refus Google (AccessDenied) revient sur la page de connexion admin, pas sur la page d'erreur Auth.js.
  pages: { signIn: '/login', error: '/admin/login' },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: { params: { hd: ADMIN_DOMAIN, prompt: 'select_account' } },
    }),
    Credentials({
      id: 'agent-otp',
      credentials: { phone: {}, code: {} },
      authorize: async (raw) => authorizeAgentOtp(String(raw?.phone ?? ''), String(raw?.code ?? '')),
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true
      return isAllowedAdmin(profile as { email?: string; email_verified?: boolean; hd?: string } | undefined)
    },
    async jwt({ token, account, user, profile }) {
      if (account?.provider === 'google') {
        token.kind = 'admin'
        token.email = String(profile?.email ?? '').toLowerCase()
      } else if (account?.provider === 'agent-otp' && user?.id) {
        token.kind = 'agent'
        token.agentId = user.id
      }
      return token
    },
    async session({ session, token }) {
      session.kind = token.kind
      session.agentId = token.agentId
      if (session.user && token.email) session.user.email = token.email
      return session
    },
  },
})
