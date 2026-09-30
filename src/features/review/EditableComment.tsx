import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "react-toastify";

import { MarkdownBody } from "~/components/markdown-body";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import { useAppContext } from "~/features/shared";
import type { CommentKind } from "~/models/conversation";

import { CommentForm } from "./CommentForm";
import {
  useDeleteCommentMutation,
  useEditCommentMutation,
} from "./data-loader";
import { useCodeReviewSnapshot } from "./store";

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant="ghost" size="icon-xs" title="Delete on GitHub">
            <Trash2 />
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete comment</AlertDialogTitle>
          <AlertDialogDescription>
            The comment will be deleted from GitHub. This action cannot be
            undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface Props {
  kind: CommentKind;
  id: number;
  author: string;
  body: string;
  header: React.ReactNode;
}

export function EditableComment({ kind, id, author, body, header }: Props) {
  const { userProfile } = useAppContext();
  const review = useCodeReviewSnapshot().selectedReview;
  const [isEditing, setIsEditing] = useState(false);
  const { mutateAsync: editComment } = useEditCommentMutation();
  const { mutateAsync: deleteComment } = useDeleteCommentMutation();

  const isOwn = author === userProfile.login;
  // submitted reviews can only be edited
  const canDelete = isOwn && kind !== "review";

  async function save(text: string) {
    if (!review) return;

    try {
      await editComment({
        owner: review.owner,
        repository: review.repository,
        number: review.prNumber,
        kind,
        id,
        body: text,
      });
      setIsEditing(false);
    } catch (error) {
      toast.error(String(error));
    }
  }

  async function remove() {
    if (!review) return;

    try {
      await deleteComment({
        owner: review.owner,
        repository: review.repository,
        kind,
        id,
      });
    } catch (error) {
      toast.error(String(error));
    }
  }

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {header}
        {isOwn && !isEditing && (
          <Button
            variant="ghost"
            size="icon-xs"
            title="Edit on GitHub"
            onClick={() => setIsEditing(true)}
          >
            <Pencil />
          </Button>
        )}
        {canDelete && !isEditing && <DeleteButton onConfirm={remove} />}
      </div>
      {isEditing ? (
        <CommentForm
          label="Edit comment"
          defaultValue={body}
          submitLabel="Save"
          onSubmit={save}
          onCancel={() => setIsEditing(false)}
        />
      ) : (
        body.trim() && <MarkdownBody content={body} />
      )}
    </div>
  );
}
