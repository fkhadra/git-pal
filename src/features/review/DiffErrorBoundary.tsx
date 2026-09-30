import { Component, type ReactNode } from "react";

interface Props {
  filename: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class DiffErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 p-8 text-sm">
          <span className="text-destructive">
            Failed to render diff for {this.props.filename}
          </span>
          <span className="text-xs text-muted-foreground">
            {this.state.error.message}
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}
