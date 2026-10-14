import { describe, expect, it, vi } from "vitest";
import { shallowRef } from "vue";
import type { FormInstance } from "element-plus";
import { useResourceFormSubmit } from "./useResourceFormSubmit";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("resource form submission", () => {
  it("validates once and sends one request despite rapid clicks during validation and saving", async () => {
    const validation = deferred<boolean>();
    const request = deferred<void>();
    const validate = vi.fn(() => validation.promise);
    const save = vi.fn(() => request.promise);
    const formRef = shallowRef<Pick<FormInstance, "validate">>({ validate });
    const submission = useResourceFormSubmit(formRef);

    const first = submission.submitForm(save);
    await Promise.all(Array.from({ length: 20 }, () => submission.submitForm(save)));
    expect(validate).toHaveBeenCalledOnce();
    expect(save).not.toHaveBeenCalled();
    expect(submission.isSubmitting.value).toBe(true);
    expect(submission.isSaving.value).toBe(false);

    validation.resolve(true);
    await vi.waitFor(() => expect(save).toHaveBeenCalledOnce());
    expect(submission.isSaving.value).toBe(true);
    await Promise.all(Array.from({ length: 20 }, () => submission.submitForm(save)));
    expect(validate).toHaveBeenCalledOnce();
    expect(save).toHaveBeenCalledOnce();

    request.resolve();
    await first;
    expect(submission.isSubmitting.value).toBe(false);
    expect(submission.isSaving.value).toBe(false);
  });

  it.each(["false", "rejection"])("skips invalid input (%s) and permits a corrected retry", async (failure) => {
    const validate = vi.fn<Pick<FormInstance, "validate">["validate"]>().mockResolvedValue(true);
    if (failure === "false") validate.mockResolvedValueOnce(false);
    else validate.mockRejectedValueOnce({ name: ["required"] });
    const save = vi.fn().mockResolvedValue(undefined);
    const submission = useResourceFormSubmit(shallowRef({ validate }));

    await submission.submitForm(save);
    expect(save).not.toHaveBeenCalled();
    expect(submission.isSubmitting.value).toBe(false);
    expect(submission.isSaving.value).toBe(false);

    await submission.submitForm(save);
    expect(save).toHaveBeenCalledOnce();
  });

  it("does not submit before the form is mounted", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const submission = useResourceFormSubmit(shallowRef<Pick<FormInstance, "validate">>());
    await submission.submitForm(save);
    expect(save).not.toHaveBeenCalled();
    expect(submission.isSubmitting.value).toBe(false);
  });

  it("releases loading after a failed request and permits retry", async () => {
    const failure = new Error("request failed");
    const save = vi.fn().mockRejectedValueOnce(failure).mockResolvedValue(undefined);
    const validate = vi.fn().mockResolvedValue(true);
    const submission = useResourceFormSubmit(shallowRef({ validate }));

    await expect(submission.submitForm(save)).rejects.toThrow(failure);
    expect(submission.isSubmitting.value).toBe(false);
    expect(submission.isSaving.value).toBe(false);

    await submission.submitForm(save);
    expect(save).toHaveBeenCalledTimes(2);
  });

  it("releases the lock when the save callback reports failure", async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
    const validate = vi.fn().mockResolvedValue(true);
    const submission = useResourceFormSubmit(shallowRef({ validate }));

    await submission.submitForm(save);
    expect(submission.isSubmitting.value).toBe(false);
    expect(submission.isSaving.value).toBe(false);
    await submission.submitForm(save);
    expect(save).toHaveBeenCalledTimes(2);
  });
});
