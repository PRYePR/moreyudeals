import DealModal from '@/components/DealModal'
import DealModalContent from './DealModalContent'

interface ModalDealPageProps {
  params: Promise<{
    id: string
  }>
}

// 拦截路由 - 从列表页点击卡片时，在 Modal 中显示详情
// 注意：这里复用现有的 /api/deals/[id] 接口获取数据
export default async function ModalDealPage({ params }: ModalDealPageProps) {
  const resolvedParams = await params

  return (
    <DealModal>
      <DealModalContent dealId={resolvedParams.id} />
    </DealModal>
  )
}
