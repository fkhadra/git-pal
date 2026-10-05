import { Pencil, Trash2 } from "lucide-react";
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
import { store, useCodeReviewSnapshot } from "./store";

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
  signedBody?: string;
  header: React.ReactNode;
}

export function EditableComment({
  kind,
  id,
  author,
  body,
  signedBody,
  header,
}: Props) {
  const { userProfile } = useAppContext();
  const snapshot = useCodeReviewSnapshot();
  const review = snapshot.selectedReview;
  const draftKey = `github:${kind}:${id}`;
  const isEditing = draftKey in snapshot.drafts;
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
      store.clearDraft(draftKey);
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
            onClick={() => store.setDraft(draftKey, body)}
          >
            <Pencil />
          </Button>
        )}
        {canDelete && !isEditing && <DeleteButton onConfirm={remove} />}
      </div>
      {isEditing ? (
        <CommentForm
          label="Edit comment"
          defaultValue={store.draft(draftKey)}
          submitLabel="Save"
          onChange={(text) => store.setDraft(draftKey, text)}
          onSubmit={save}
          onCancel={() => store.clearDraft(draftKey)}
        />
      ) : (
        body.trim() && <MarkdownBody content={signedBody ?? body} />
      )}
    </div>
  );
}
