import type { SeedWithEnrollment } from "../types/seeds";

export function mergeSeedEnrollmentState(
  previousSeeds: SeedWithEnrollment[],
  nextSeeds: SeedWithEnrollment[],
): SeedWithEnrollment[] {
  const previousById = new Map(previousSeeds.map((seed) => [seed.id, seed]));

  return nextSeeds.map((seed) => {
    const previousEnrollment = previousById.get(seed.id)?.enrollment;
    if (!previousEnrollment) return seed;

    return {
      ...seed,
      enrollment: seed.enrollment
        ? { ...previousEnrollment, ...seed.enrollment }
        : previousEnrollment,
    };
  });
}
