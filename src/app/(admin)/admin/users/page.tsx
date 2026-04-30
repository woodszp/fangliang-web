'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import * as XLSX from 'xlsx'
import { Search, FileDown, Package, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { Order, ProfileWithStats, UserRole } from '@/types'

export default function AdminUsersPage() {
  const supabase = createClient()
  const router = useRouter()
  const { role } = useAuthStore()

  const [users, setUsers] = useState<ProfileWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (role !== 'admin') {
      router.push('/')
      return
    }

    const fetchUsers = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*, orders(*)')
        .order('created_at', { ascending: false })

      if (data) {
        // Calculate user stats
        const usersWithStats = data.map(user => ({
          ...user,
          totalOrders: user.orders?.length || 0,
          totalSpent: user.orders?.reduce((sum: number, o: Order) => sum + Number(o.total_amount), 0) || 0,
        }))
        setUsers(usersWithStats)
      }
      setLoading(false)
    }

    fetchUsers()
  }, [supabase, role, router])

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (!error) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success('角色已更新')
    }
  }

  const handleExport = () => {
    const exportData = users.map(user => ({
      '用户ID': user.id.slice(0, 8),
      '姓名': user.full_name || '-',
      '手机': user.phone || '-',
      '角色': user.role === 'admin' ? '管理员' : '用户',
      '订单数': user.totalOrders,
      '消费总额': user.totalSpent,
      '注册时间': new Date(user.created_at).toLocaleString(),
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '用户')
    XLSX.writeFile(wb, `用户_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const filteredUsers = users.filter(u =>
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.phone?.includes(searchQuery) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalRevenue = users.reduce((sum, u) => sum + u.totalSpent, 0)

  if (loading) {
    return <div className="container mx-auto px-4 py-8">加载中...</div>
  }

  if (role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r bg-gray-50 p-4">
        <Link href="/admin" className="flex items-center gap-2 mb-6">
          <Package className="h-6 w-6" />
          <span className="text-xl font-bold">商户中心</span>
        </Link>
        <nav className="space-y-2">
          <Link href="/admin">
            <Button variant="ghost" className="w-full justify-start">数据统计</Button>
          </Link>
          <Link href="/admin/products">
            <Button variant="ghost" className="w-full justify-start">商品管理</Button>
          </Link>
          <Link href="/admin/orders">
            <Button variant="ghost" className="w-full justify-start">订单管理</Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="default" className="w-full justify-start">用户管理</Button>
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">用户管理</h1>
          <Button onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            导出用户
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Users className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">用户总数</p>
                  <p className="text-2xl font-bold">{users.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <Package className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">总订单数</p>
                  <p className="text-2xl font-bold">{users.reduce((sum, u) => sum + u.totalOrders, 0)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <FileDown className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">总收入</p>
                  <p className="text-2xl font-bold">¥{totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索用户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户ID</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>手机</TableHead>
                  <TableHead>角色</TableHead>
                  <TableHead>订单数</TableHead>
                  <TableHead>消费总额</TableHead>
                  <TableHead>注册时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map(user => (
                  <TableRow key={user.id}>
                    <TableCell className="font-mono text-sm">{user.id.slice(0, 8)}</TableCell>
                    <TableCell>{user.full_name || '-'}</TableCell>
                    <TableCell>{user.phone || '-'}</TableCell>
                    <TableCell>
                      <Select value={user.role} onValueChange={(v) => handleUpdateRole(user.id, v as UserRole)}>
                        <SelectTrigger className="w-[100px]">
                          <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                            {user.role === 'admin' ? '管理员' : '用户'}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">用户</SelectItem>
                          <SelectItem value="admin">管理员</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>{user.totalOrders}</TableCell>
                    <TableCell className="font-medium">¥{user.totalSpent.toFixed(2)}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}