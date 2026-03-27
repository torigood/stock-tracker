import { TradeForm } from '../components/TradeForm/TradeForm'

interface Props {
  onDone: () => void
}

export function AddTradePage({ onDone }: Props) {
  return (
    <div className="flex justify-center">
      <TradeForm onClose={onDone} />
    </div>
  )
}
