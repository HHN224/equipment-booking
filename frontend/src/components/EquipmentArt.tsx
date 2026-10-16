import AppIcon from './AppIcon'

const categoryIcons: Record<string, string> = {
  相机: 'camera',
  投影仪: 'projector',
  测试手机: 'phone',
  音频设备: 'audio',
}

export default function EquipmentArt({ category, code }: { category: string; code: string }) {
  const kind = categoryIcons[category] || 'box'

  return (
    <div className={`equipment-art ${kind}`}>
      <span className="art-code">{code}</span>
      <span className="art-circle" />
      <AppIcon
        name={kind}
        size={76}
      />
      <span className="art-caption">TEAM EQUIPMENT / 共享设备</span>
    </div>
  )
}
