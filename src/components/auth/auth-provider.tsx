'use client'

import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useEffect, type ReactNode } from 'react'
import { toast } from 'sonner'

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { setUser, setRole, setLoading, logout } = useAuthStore()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          console.error('Error getting user:', error)
          setLoading(false)
          return
        }

        if (user) {
          setUser(user)

          // Get user role from profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

          if (profile) {
            setRole(profile.role)
          }
        }
      } catch (error) {
        console.error('Error in auth check:', error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profile) {
          setRole(profile.role)
        }
      } else {
        setUser(null)
        setRole(null)
      }
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, setUser, setRole, setLoading])

  return <>{children}</>
}

export async function signIn(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    toast.error(error.message)
    return { success: false, error }
  }

  // Get user role
  if (data.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile) {
      useAuthStore.getState().setRole(profile.role)
    }
  }

  toast.success('登录成功')
  return { success: true, data }
}

export async function signUp(email: string, password: string) {
  const supabase = createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'user',
        full_name: '',
        phone: '',
      }
    }
  })

  if (error) {
    toast.error(error.message)
    return { success: false, error }
  }

  toast.success('注册成功！请登录')
  return { success: true, data }
}

export async function signOut() {
  const supabase = createClient()
  await supabase.auth.signOut()
  useAuthStore.getState().logout()
  toast.success('已退出登录')
}

export async function updateUserRole(userId: string, role: 'user' | 'admin') {
  const supabase = createClient()

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) {
    toast.error('更新角色失败')
    return { success: false, error }
  }

  toast.success('角色已更新')
  return { success: true }
}