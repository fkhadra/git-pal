import { Organization } from "~/models";
import { Container } from "./Layout";
import { RepositoryIcon } from "./RepositoryIcon";

export function OrganizationItem({
  organization,
}: {
  organization: Organization;
}) {
  return (
    <Container>
      <RepositoryIcon avatarUrl={organization.avatarUrl} isInOrganization />
      <div className="flex flex-col">{organization.name}</div>
    </Container>
  );
}
