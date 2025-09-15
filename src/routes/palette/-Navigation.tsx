import { Link, LinkComponentProps, useNavigate } from "@tanstack/react-router";
import { House, GitPullRequestArrow, MessageCircleMore } from "lucide-react";
import { useEffect, useRef } from "react";

interface LinkItem {
  to: LinkComponentProps["to"];
  icon: React.JSXElementConstructor<{ className?: string }>;
  search?: LinkComponentProps["search"];
  label: string;
}

const links: LinkItem[] = [
  {
    to: "/palette",
    icon: House,
    label: "Home",
  },
  {
    to: "/palette/pull-requests",
    icon: GitPullRequestArrow,
    label: "Review Requested",
    search: {
      filter: "review-requested",
    },
  },
  {
    to: "/palette/pull-requests",
    icon: MessageCircleMore,
    label: "Mentioned",
    search: {
      filter: "mentioned",
    },
  },
];

export function Navigation() {
  const navigate = useNavigate();
  const nav = useRef<HTMLElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "[") {
        e.preventDefault();

        const previous =
          nav.current?.querySelector<HTMLAnchorElement>(
            "a.active",
          )?.previousSibling;

        if (previous && previous instanceof HTMLAnchorElement) {
          navigate({
            to: previous.getAttribute("href")!,
          });
        }
      } else if (e.key === "]") {
        e.preventDefault();

        const next =
          nav.current?.querySelector<HTMLAnchorElement>(
            "a.active",
          )?.nextSibling;

        if (next && next instanceof HTMLAnchorElement) {
          navigate({
            to: next.getAttribute("href")!,
          });
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [navigate]);

  return null;

  return (
    <nav
      ref={nav}
      className="py flex h-12 w-full items-center gap-3 border-b border-b-pink-50/10 py-2"
    >
      {links.map((link, index) => (
        <Link
          key={index}
          to={link.to}
          search={link.search}
          className="flex h-full items-center rounded-md px-2 text-gray-300 [&.active]:bg-zinc-800 [&.active]:text-white"
          activeOptions={{
            exact: true,
          }}
        >
          <link.icon className="mr-2 h-5 w-5" /> <span>{link.label}</span>
        </Link>
      ))}
    </nav>
  );
}
