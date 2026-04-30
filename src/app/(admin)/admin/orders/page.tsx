'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import * as XLSX from 'xlsx'
import { Search, FileDown, Package, ShoppingBag, Users } from 'lucide-react'
import { toast } from 'sonner'
import type { Order, OrderItem } from '@/types'

const statusMap = {
  pending: { label: '待确认', color: 'bg-yellow-500' },
  confirmed: { label: '已确认', color: 'bg-blue-500' },
  shipped: { label: '已发货', color: 'bg-purple-500' },
  completed: { label: '已完成', color: 'bg-green-500' },
  cancelled: { label: '已取消', color: 'bg-gray-500' },
}

export default function AdminOrdersPage() {
  const supabase = createClient()
  const router = useRouter()
  const { role } = useAuthStore()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  useEffect(() => {
    if (role !== 'admin') {
      router.push('/')
      return
    }

    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*, user:profiles(*), items:order_items(*, product:products(*)), address:addresses(*)')
        .order('created_at', { ascending: false })

      if (data) setOrders(data)
      setLoading(false)
    }

    fetchOrders()
  }, [supabase, role, router])

  const handleUpdateStatus = async (orderId: string, status: Order['status']) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o))
      toast.success('状态已更新')
    }
  }

  const handleExport = () => {
    const exportData = orders.map(order => ({
      '订单号': order.id.slice(0, 8),
      '下单日期': order.order_date,
      '用户': order.user?.full_name || order.user?.id?.slice(0, 8),
      '联系电话': order.address?.phone || '',
      '收货地址': order.address ? `${order.address.province}${order.address.city}${order.address.district}${order.address.detail_address}` : '',
      '商品信息': order.items?.map((i: OrderItem) => `${i.product?.name} x${i.quantity}`).join('; ') || '',
      '订单金额': order.total_amount,
      '状态': statusMap[order.status as keyof typeof statusMap]?.label,
      '下单时间': new Date(order.created_at).toLocaleString(),
    }))

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '订单')
    XLSX.writeFile(wb, `订单_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const filteredOrders = orders.filter(o => {
    const matchesSearch = !searchQuery ||
      o.user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.id.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || o.status === statusFilter
    return matchesSearch && matchesStatus
  })

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
            <Button variant="default" className="w-full justify-start">订单管理</Button>
          </Link>
          <Link href="/admin/users">
            <Button variant="ghost" className="w-full justify-start">用户管理</Button>
          </Link>
        </nav>
      </aside>

      <main className="flex-1 p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">订单管理</h1>
          <Button onClick={handleExport}>
            <FileDown className="mr-2 h-4 w-4" />
            导出订单
          </Button>
        </div>

        <div className="flex gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="搜索订单..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || 'all')}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="订单状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="pending">待确认</SelectItem>
              <SelectItem value="confirmed">已确认</SelectItem>
              <SelectItem value="shipped">已发货</SelectItem>
              <SelectItem value="completed">已完成</SelectItem>
              <SelectItem value="cancelled">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>商品</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map(order => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div>
                        <p>{order.user?.full_name || '-'}</p>
                        <p className="text-xs text-muted-foreground">{order.address?.phone || '-'}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {order.items?.map((item: OrderItem) => (
                          <p key={item.id} className="text-sm truncate">
                            {item.product?.name} x{item.quantity}
                          </p>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">¥{order.total_amount.toFixed(2)}</TableCell>
                    <TableCell>
                      <Select value={order.status} onValueChange={(v) => v && handleUpdateStatus(order.id, v as Order['status'])}>
                        <SelectTrigger className="w-[100px]">
                          <Badge className={statusMap[order.status as keyof typeof statusMap].color}>
                            {statusMap[order.status as keyof typeof statusMap].label}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">待确认</SelectItem>
                          <SelectItem value="confirmed">已确认</SelectItem>
                          <SelectItem value="shipped">已发货</SelectItem>
                          <SelectItem value="completed">已完成</SelectItem>
                          <SelectItem value="cancelled">已取消</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{order.order_date}</p>
                        <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleTimeString()}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {order.address && (
                        <div className="text-xs text-muted-foreground max-w-[150px] truncate">
                          {order.address.province}{order.address.city}{order.address.district}
                        </div>
                      )}
                    </TableCell>
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