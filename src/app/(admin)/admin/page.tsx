'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth'
import { signOut } from '@/components/auth/auth-provider'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ShoppingBag,
  Package,
  Users,
  BarChart3,
  LogOut,
  Plus,
  Search,
  Edit,
  Trash2,
  FileDown,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import * as XLSX from 'xlsx'
import type { Order, OrderItem } from '@/types'

const statusMap = {
  pending: { label: '待确认', color: 'bg-yellow-500' },
  confirmed: { label: '已确认', color: 'bg-blue-500' },
  shipped: { label: '已发货', color: 'bg-purple-500' },
  completed: { label: '已完成', color: 'bg-green-500' },
  cancelled: { label: '已取消', color: 'bg-gray-500' },
}

export default function AdminPage() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { role } = useAuthStore()

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalProducts: 0,
    totalUsers: 0,
    todayOrders: 0,
    todayRevenue: 0,
  })
  const [recentOrders, setRecentOrders] = useState<Order[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role !== 'admin') {
      router.push('/')
      return
    }

    const fetchData = async () => {
      // Get stats
      const today = new Date().toISOString().split('T')[0]

      const [ordersResult, productsResult, usersResult] = await Promise.all([
        supabase.from('orders').select('*'),
        supabase.from('products').select('*'),
        supabase.from('profiles').select('*').eq('role', 'user'),
      ])

      const allOrders: Order[] = ordersResult.data || []
      const todayOrders = allOrders.filter((o) => o.order_date === today)

      setStats({
        totalOrders: allOrders.length,
        totalRevenue: allOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
        totalProducts: (productsResult.data || []).length,
        totalUsers: (usersResult.data || []).length,
        todayOrders: todayOrders.length,
        todayRevenue: todayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
      })

      // Get recent orders
      const { data: recentData } = await supabase
        .from('orders')
        .select('*, user:profiles(*), items:order_items(*, product:products(*))')
        .order('created_at', { ascending: false })
        .limit(5)

      if (recentData) {
        setRecentOrders(recentData)
      }

      // Get all orders for export
      const { data: allOrdersData } = await supabase
        .from('orders')
        .select('*, user:profiles(*), address:addresses(*), items:order_items(*, product:products(*))')
        .order('created_at', { ascending: false })

      if (allOrdersData) {
        setOrders(allOrdersData)
      }

      setLoading(false)
    }

    fetchData()
  }, [supabase, role, router])

  const handleExportTodayOrders = () => {
    const today = new Date().toISOString().split('T')[0]
    const todayOrders = orders.filter((o) => o.order_date === today)

    const exportData = todayOrders.flatMap((order) =>
      (order.items || []).map((item: OrderItem) => ({
        '订单号': order.id.slice(0, 8),
        '下单日期': order.order_date,
        '用户': order.user?.full_name || order.user?.id?.slice(0, 8),
        '商品名称': item.product?.name,
        '规格': `${item.color || ''} ${item.size || ''}`.trim(),
        '单价': item.price,
        '数量': item.quantity,
        '小计': item.price * item.quantity,
        '订单金额': order.total_amount,
        '状态': statusMap[order.status as keyof typeof statusMap]?.label,
      }))
    )

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '今日订单')
    XLSX.writeFile(wb, `订单_${today}.xlsx`)
  }

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (!error) {
      setOrders(orders.map((o) => o.id === orderId ? { ...o, status: status as Order['status'] } : o))
      setRecentOrders(recentOrders.map((o) => o.id === orderId ? { ...o, status: status as Order['status'] } : o))
    }
  }

  if (loading) {
    return <div className="container mx-auto px-4 py-8">加载中...</div>
  }

  if (role !== 'admin') {
    return null
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50">
        <div className="p-4">
          <Link href="/admin" className="flex items-center gap-2 mb-6">
            <ShoppingBag className="h-6 w-6" />
            <span className="text-xl font-bold">商户中心</span>
          </Link>
          <nav className="space-y-2">
            <Link href="/admin">
              <Button variant={pathname === '/admin' ? 'default' : 'ghost'} className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                数据统计
              </Button>
            </Link>
            <Link href="/admin/products">
              <Button variant={pathname.startsWith('/admin/products') ? 'default' : 'ghost'} className="w-full justify-start">
                <Package className="mr-2 h-4 w-4" />
                商品管理
              </Button>
            </Link>
            <Link href="/admin/orders">
              <Button variant={pathname.startsWith('/admin/orders') ? 'default' : 'ghost'} className="w-full justify-start">
                <ShoppingBag className="mr-2 h-4 w-4" />
                订单管理
              </Button>
            </Link>
            <Link href="/admin/users">
              <Button variant={pathname.startsWith('/admin/users') ? 'default' : 'ghost'} className="w-full justify-start">
                <Users className="mr-2 h-4 w-4" />
                用户管理
              </Button>
            </Link>
          </nav>
        </div>
        <div className="absolute bottom-4 left-4 w-56">
          <Button variant="outline" className="w-full" onClick={() => { signOut(); router.push('/login') }}>
            <LogOut className="mr-2 h-4 w-4" />
            退出登录
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">数据统计</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总订单数</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalOrders}</div>
              <p className="text-xs text-muted-foreground">
                今日 +{stats.todayOrders}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总收入</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{stats.totalRevenue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                今日 +¥{stats.todayRevenue.toFixed(2)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">商品总数</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProducts}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">用户总数</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 mb-8">
          <Button onClick={handleExportTodayOrders}>
            <FileDown className="mr-2 h-4 w-4" />
            导出今日订单
          </Button>
          <Link href="/admin/products">
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              添加商品
            </Button>
          </Link>
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle>最近订单</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">
                      {order.user?.full_name || order.user?.id?.slice(0, 8)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {order.items?.length} 件商品 · ¥{order.total_amount.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusMap[order.status as keyof typeof statusMap].color}>
                      {statusMap[order.status as keyof typeof statusMap].label}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}