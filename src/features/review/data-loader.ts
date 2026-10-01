import {
  queryOptions,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { minutesToMilliseconds } from "date-fns";

import commands from "~/commands";
import { useJobs } from "~/features/jobs";
import { getPullRequestStatus } from "~/features/palette/Github/PullRequestStatus";
import type { FileSourceRequest, ReviewEvent } from "~/models";
import type {
  CodeReview,
  GetSavedReviewRequest,
  ReviewComment,
  SetFileViewedRequest,
  ViewedFile,
  ReviewListEntry,
  ReviewStatus,
} from "~/models/code-review";

import { isPendingComment, reviewJobId } from "./utils";

export const repositoryClonedKey = (owner: string, repository: string) => [
  "repository-cloned",
  owner,
  repository,
];

export function useCodeReviewQuery(review?: GetSavedReviewRequest | null) {
  const queryClient = useQueryClient();
  const enabled = !!review;
  const request = {
    owner: review?.owner ?? "",
    repository: review?.repository ?? "",
    number: review?.prNumber ?? 0,
  };

  return useQueries({
    queries: [
      {
        queryKey: ["pr-diff", request],
        queryFn: async () => {
          await queryClient.query({
            queryKey: repositoryClonedKey(request.owner, request.repository),
            queryFn: () =>
              commands.isRepositoryCloned(request.owner, request.repository),
            staleTime: 0,
          });

          return commands.getPullRequestDiff(request);
        },
        staleTime: minutesToMilliseconds(5),
        enabled,
      },
      {
        queryKey: ["pr-details", request],
        queryFn: () => commands.getPullRequest(request),
        staleTime: minutesToMilliseconds(5),
        enabled,
      },
      {
        queryKey: ["saved-review", request],
        queryFn: () =>
          commands.getReview({
            owner: request.owner,
            repository: request.repository,
            prNumber: request.number,
          }),
        staleTime: 0,
        gcTime: 0,
        enabled,
      },
    ],
  });
}

const BUILDING_REFETCH_MS = 30_000;

export function usePullRequestStatusQuery(review: GetSavedReviewRequest) {
  const request = {
    owner: review.owner,
    repository: review.repository,
    number: review.prNumber,
  };

  return useQuery({
    queryKey: ["pr-status", request],
    queryFn: () => commands.getPullRequestStatus(request),
    refetchInterval: (query) => {
      const pr = query.state.data;
      if (!pr || getPullRequestStatus(pr) !== "Building") return false;

      return BUILDING_REFETCH_MS;
    },
  });
}

export function fileSourceQuery(request: FileSourceRequest) {
  return queryOptions({
    queryKey: ["file-source", request],
    queryFn: () => commands.getFileSource(request),
    staleTime: Infinity,
    enabled: false,
  });
}

const HEAD_POLL_MS = minutesToMilliseconds(2);

export function useLatestHeadShaQuery(review: GetSavedReviewRequest) {
  const request = {
    owner: review.owner,
    repository: review.repository,
    number: review.prNumber,
  };

  return useQuery({
    queryKey: ["pr-head", request],
    queryFn: async () => (await commands.getPullRequest(request)).headSha,
    refetchInterval: HEAD_POLL_MS,
  });
}

export function useNewCommitsQuery(review: CodeReview, headSha: string) {
  const request = {
    owner: review.owner,
    repository: review.repository,
    base: review.headSha,
    head: headSha,
  };

  return useQuery({
    queryKey: ["pr-compare", request],
    queryFn: () => commands.compareCommits(request),
    enabled: review.headSha !== headSha,
    staleTime: Infinity,
    retry: false,
  });
}

const DESCRIPTION_STALE_MS = minutesToMilliseconds(4);

export function useDescriptionQuery(
  review: GetSavedReviewRequest,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      "pr-description",
      review.owner,
      review.repository,
      review.prNumber,
    ],
    queryFn: () =>
      commands.getPullRequestDescription({
        owner: review.owner,
        repository: review.repository,
        number: review.prNumber,
      }),
    staleTime: DESCRIPTION_STALE_MS,
    enabled,
  });
}

export function useConversationQuery(review?: GetSavedReviewRequest | null) {
  return useQuery({
    queryKey: [
      "pr-conversation",
      review?.owner,
      review?.repository,
      review?.prNumber,
    ],
    queryFn: () =>
      commands.getPullRequestConversation({
        owner: review!.owner,
        repository: review!.repository,
        number: review!.prNumber,
      }),
    staleTime: minutesToMilliseconds(1),
    enabled: !!review,
  });
}

export function useEditCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commands.editComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pr-conversation"] });
    },
  });
}

export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commands.deleteComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pr-conversation"] });
    },
  });
}

export function useSaveCommentsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      currentReview,
      comments,
    }: {
      currentReview: ReviewListEntry;
      comments: ReviewComment[];
    }) => {
      await commands.updateReviewComments({
        owner: currentReview.owner,
        repository: currentReview.repository,
        prNumber: currentReview.prNumber,
        comments,
      });

      queryClient.invalidateQueries({ queryKey: ["saved-review"] });
    },
  });
}

export function useReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commands.reviewPullRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["saved-review"] });
      // the review now remembers its template
      queryClient.invalidateQueries({
        queryKey: ["review-templates", "resolved"],
      });
    },
  });
}

export function useSavedReviewsQuery() {
  return useQuery({
    queryKey: ["saved-reviews"],
    queryFn: commands.listReviews,
    staleTime: minutesToMilliseconds(1),
  });
}

export function useDeleteReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commands.deleteReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reviews"] });
    },
  });
}

export function useUpdateReviewStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: GetSavedReviewRequest & { status: ReviewStatus }) =>
      commands.updateReviewStatus(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reviews"] });
    },
  });
}

const viewedFilesKey = (review?: GetSavedReviewRequest | null) => [
  "viewed-files",
  review?.owner,
  review?.repository,
  review?.prNumber,
];

export function useViewedFilesQuery(review?: GetSavedReviewRequest | null) {
  return useQuery({
    queryKey: viewedFilesKey(review),
    queryFn: () => commands.listViewedFiles(review!),
    enabled: !!review,
  });
}

export function useSetFileViewedMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: commands.setFileViewed,
    onMutate: (request: SetFileViewedRequest) => {
      queryClient.setQueryData<ViewedFile[]>(
        viewedFilesKey(request),
        (files = []) => {
          const others = files.filter((f) => f.filename !== request.filename);
          if (!request.viewed) return others;

          return [...others, { filename: request.filename, sha: request.sha }];
        },
      );
    },
    onSettled: (_data, _error, request) => {
      queryClient.invalidateQueries({ queryKey: viewedFilesKey(request) });
    },
  });
}

interface SubmitReviewParams {
  review: CodeReview;
  commitId: string;
  body: string;
  event: ReviewEvent;
}

export function useSubmitReviewMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      review,
      commitId,
      body,
      event,
    }: SubmitReviewParams) => {
      const key = {
        owner: review.owner,
        repository: review.repository,
        prNumber: review.prNumber,
      };

      await commands.submitReview({
        owner: key.owner,
        repository: key.repository,
        number: key.prNumber,
        commitId,
        body,
        event,
        comments: review.comments.filter(isPendingComment).map((c) => ({
          path: c.file,
          body: c.comment,
          line: c.line,
          startLine: c.startLine,
        })),
      });

      await commands.updateReviewComments({
        ...key,
        comments: review.comments.map((c) =>
          isPendingComment(c) ? { ...c, posted: true } : c,
        ),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-review"] });
      queryClient.invalidateQueries({ queryKey: ["saved-reviews"] });
      queryClient.invalidateQueries({ queryKey: ["pr-conversation"] });
    },
  });
}

export function useReviewingJobIds() {
  const { tasks } = useJobs();

  return new Set(
    tasks
      .filter((t) => t.status === "queued" || t.status === "running")
      .map((t) => t.jobId),
  );
}

export function useDeleteReviewsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    // one at a time, deleting a review also prunes its repository's worktrees
    mutationFn: async (reviews: GetSavedReviewRequest[]) => {
      for (const review of reviews) {
        await commands.deleteReview(review);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-reviews"] });
    },
  });
}

export function useIsReviewing(review?: GetSavedReviewRequest | null) {
  const { tasks } = useJobs();

  if (!review) return false;

  const jobId = reviewJobId(review);

  return tasks.some(
    (t) =>
      t.jobId === jobId && (t.status === "queued" || t.status === "running"),
  );
}
