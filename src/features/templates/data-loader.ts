import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import commands from "~/commands";
import type { ReviewTemplateInput } from "~/models/code-review";

const TEMPLATES_KEY = ["review-templates"];

export function useTemplatesQuery() {
  return useQuery({
    queryKey: TEMPLATES_KEY,
    queryFn: commands.listReviewTemplates,
  });
}

export function useBuiltInInstructionsQuery() {
  return useQuery({
    queryKey: ["built-in-instructions"],
    queryFn: commands.builtInReviewInstructions,
    staleTime: Infinity,
  });
}

export function useSkillsQuery() {
  return useQuery({
    queryKey: ["skills"],
    queryFn: commands.listSkills,
  });
}

export function useResolvedTemplateQuery(
  owner?: string,
  repository?: string,
  prNumber?: number,
) {
  return useQuery({
    queryKey: [...TEMPLATES_KEY, "resolved", owner, repository, prNumber],
    queryFn: () =>
      commands.resolveReviewTemplate(owner!, repository!, prNumber),
    enabled: !!owner && !!repository,
  });
}

function useInvalidateTemplates() {
  const queryClient = useQueryClient();

  return () => queryClient.invalidateQueries({ queryKey: TEMPLATES_KEY });
}

export function useSaveTemplateMutation() {
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: ({ id, input }: { id?: number; input: ReviewTemplateInput }) =>
      id == null
        ? commands.createReviewTemplate(input)
        : commands.updateReviewTemplate(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteTemplateMutation() {
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: commands.deleteReviewTemplate,
    onSuccess: invalidate,
  });
}

export function useReorderTemplatesMutation() {
  const invalidate = useInvalidateTemplates();

  return useMutation({
    mutationFn: commands.reorderReviewTemplates,
    onSuccess: invalidate,
  });
}
