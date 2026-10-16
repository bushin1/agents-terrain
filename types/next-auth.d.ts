import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    kind?: 'admin' | 'agent'
    agentId?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    kind?: 'admin' | 'agent'
    agentId?: string
  }
}
