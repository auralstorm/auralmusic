import { useMemo, useState } from 'react'

import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  buildPlaylistUpdatePayload,
  PLAYLIST_NAME_MAX_LENGTH,
  resolvePlaylistDetailMoreActions,
} from '../playlist-detail-actions.model'

interface PlaylistDetailMoreActionsProps {
  playlistId: number
  playlistName: string
  playlistDescription: string
  isOwnPlaylist: boolean
  editSubmitting?: boolean
  deleteSubmitting?: boolean
  onEdit: (payload: {
    id: number
    name: string
    desc: string
  }) => Promise<void> | void
  onDelete: (playlistId: number) => Promise<void> | void
}

const PlaylistDetailMoreActions = ({
  playlistId,
  playlistName,
  playlistDescription,
  isOwnPlaylist,
  editSubmitting = false,
  deleteSubmitting = false,
  onEdit,
  onDelete,
}: PlaylistDetailMoreActionsProps) => {
  const [menuOpen, setMenuOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [draftName, setDraftName] = useState(playlistName)
  const [draftDescription, setDraftDescription] = useState(playlistDescription)

  const actions = useMemo(
    () => resolvePlaylistDetailMoreActions(isOwnPlaylist),
    [isOwnPlaylist]
  )

  const editPayload = useMemo(
    () =>
      buildPlaylistUpdatePayload({
        id: playlistId,
        name: draftName,
        description: draftDescription,
      }),
    [draftDescription, draftName, playlistId]
  )

  if (actions.length === 0) {
    return null
  }

  const resetDraft = () => {
    setDraftName(playlistName)
    setDraftDescription(playlistDescription)
  }

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open)
    if (open) {
      resetDraft()
    }
  }

  const handleSubmitEdit = async () => {
    if (!editPayload || editSubmitting) {
      return
    }

    await onEdit(editPayload)
    setEditOpen(false)
  }

  const handleConfirmDelete = async () => {
    if (deleteSubmitting) {
      return
    }

    await onDelete(playlistId)
    setDeleteOpen(false)
  }

  return (
    <>
      <DropdownMenu modal={false} open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            type='button'
            size='icon-lg'
            variant='secondary'
            className='w-[100px] rounded-full py-7'
            aria-label='打开歌单更多操作'
          >
            <MoreHorizontal className='size-5' />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent
          align='start'
          className='min-w-[180px] rounded-[18px] p-2'
        >
          <DropdownMenuItem
            className='rounded-[14px] px-3 py-2.5'
            onSelect={event => {
              event.preventDefault()
              setMenuOpen(false)
              handleEditOpenChange(true)
            }}
          >
            <Pencil className='size-4' />
            编辑歌单
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant='destructive'
            className='rounded-[14px] px-3 py-2.5'
            onSelect={event => {
              event.preventDefault()
              setMenuOpen(false)
              setDeleteOpen(true)
            }}
          >
            <Trash2 className='size-4' />
            删除歌单
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent
          className='max-w-[520px] overflow-hidden rounded-[28px] p-0'
          showCloseButton={false}
        >
          <div className='p-6'>
            <DialogHeader className='space-y-2 border-b pb-4'>
              <DialogTitle className='text-lg font-semibold'>
                编辑歌单
              </DialogTitle>
              <DialogDescription>
                可修改歌单标题与简介，保存后会立即同步到当前歌单。
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-4 py-5'>
              <div className='space-y-2'>
                <label className='text-sm font-medium'>歌单标题</label>
                <Input
                  value={draftName}
                  maxLength={PLAYLIST_NAME_MAX_LENGTH}
                  onChange={event => setDraftName(event.target.value)}
                  placeholder='歌单标题'
                  className='h-11 rounded-[16px]'
                />
              </div>

              <div className='space-y-2'>
                <label className='text-sm font-medium'>歌单简介</label>
                <Textarea
                  value={draftDescription}
                  onChange={event => setDraftDescription(event.target.value)}
                  placeholder='给这个歌单补一段简介'
                  className='min-h-28 rounded-[16px]'
                />
              </div>
            </div>
          </div>

          <DialogFooter className='mx-0 mb-0 rounded-b-[28px] bg-transparent px-6 py-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setEditOpen(false)}
              disabled={editSubmitting}
              className='rounded-[14px]'
            >
              取消
            </Button>
            <Button
              type='button'
              disabled={!editPayload || editSubmitting}
              onClick={() => void handleSubmitEdit()}
              className='rounded-[14px]'
            >
              {editSubmitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent
          className='max-w-[420px] overflow-hidden rounded-[28px] p-0'
          showCloseButton={false}
        >
          <div className='p-6'>
            <DialogHeader className='space-y-2 border-b pb-4'>
              <DialogTitle className='text-lg font-semibold'>
                删除歌单
              </DialogTitle>
              <DialogDescription>
                删除后歌单内的组织关系会移除，这个操作无法撤销。
              </DialogDescription>
            </DialogHeader>

            <div className='py-5 text-sm leading-7'>
              确认删除“{playlistName}”吗？
            </div>
          </div>

          <DialogFooter className='mx-0 mb-0 rounded-b-[28px] bg-transparent px-6 py-4'>
            <Button
              type='button'
              variant='outline'
              onClick={() => setDeleteOpen(false)}
              disabled={deleteSubmitting}
              className='rounded-[14px]'
            >
              取消
            </Button>
            <Button
              type='button'
              variant='destructive'
              disabled={deleteSubmitting}
              onClick={() => void handleConfirmDelete()}
              className='rounded-[14px]'
            >
              {deleteSubmitting ? '删除中...' : '删除歌单'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PlaylistDetailMoreActions
