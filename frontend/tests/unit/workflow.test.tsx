import React from "react";
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfidenceBadge } from "@/components/evidence/confidence-badge";
import { LimitationNotice } from "@/components/evidence/limitation-notice";
import { HumanReviewBanner } from "@/components/evidence/human-review-banner";

describe("Workflow & Evidence Components", () => {
  it("renders confidence badge with high confidence label", () => {
    render(<ConfidenceBadge confidence="high" />);
    expect(screen.getByText("High Confidence")).toBeInTheDocument();
  });

  it("renders limitation notices properly", () => {
    const limits = ["Requires English peer-reviewed papers only", "Excludes preprints under 30 days"];
    render(<LimitationNotice limitations={limits} />);
    expect(screen.getByText("Requires English peer-reviewed papers only")).toBeInTheDocument();
    expect(screen.getByText("Excludes preprints under 30 days")).toBeInTheDocument();
  });

  it("handles faculty review sign-off and trigger callback", () => {
    const onApprove = vi.fn();
    render(<HumanReviewBanner isApproved={false} onApprove={onApprove} />);

    expect(screen.getByText("Faculty Review & Judgment Required")).toBeInTheDocument();

    const approveButton = screen.getByText("Approve & Sign Off");
    fireEvent.click(approveButton);

    expect(onApprove).toHaveBeenCalled();
    expect(screen.getByText("Faculty Sign-Off Completed")).toBeInTheDocument();
  });
});
