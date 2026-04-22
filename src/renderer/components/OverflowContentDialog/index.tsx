import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'

interface OverflowContentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  content: string
}

const OverflowContentDialog = ({
  open,
  onOpenChange,
  title,
  content,
}: OverflowContentDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='w-full max-w-[500px] gap-5 rounded-[15px] px-6 py-6 sm:max-w-[50vw]'>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className='h-[50vh] w-full pr-2'>
          <p className='text-muted-foreground text-justify text-base leading-8 whitespace-pre-wrap'>
            {content}
          </p>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

export default OverflowContentDialog
