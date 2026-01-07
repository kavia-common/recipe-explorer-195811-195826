"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Recipe } from "@/lib/recipes";
import { loadRecipes } from "@/lib/recipes";

type FilterState = {
  query: string;
  tag: string;
  cuisine: string;
  maxMinutes: string;
};

function uniqueSorted(values: (string | undefined)[]): string[] {
  return Array.from(
    new Set(values.filter((v): v is string => Boolean(v && v.trim())).map((v) => v.trim())),
  ).sort((a, b) => a.localeCompare(b));
}

function recipeMatches(recipe: Recipe, f: FilterState): boolean {
  const q = f.query.trim().toLowerCase();
  const tag = f.tag.trim().toLowerCase();
  const cuisine = f.cuisine.trim().toLowerCase();
  const max = Number(f.maxMinutes);

  const haystack = [
    recipe.title,
    recipe.description,
    recipe.cuisine ?? "",
    recipe.tags.join(" "),
    recipe.ingredients.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  if (q && !haystack.includes(q)) return false;
  if (tag && !recipe.tags.some((t) => t.toLowerCase() === tag)) return false;
  if (cuisine && (recipe.cuisine ?? "").toLowerCase() !== cuisine) return false;
  if (f.maxMinutes.trim() && Number.isFinite(max)) {
    if (typeof recipe.minutes === "number" && recipe.minutes > max) return false;
  }

  return true;
}

export default function Home() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    query: "",
    tag: "",
    cuisine: "",
    maxMinutes: "",
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await loadRecipes();
        if (!mounted) return;
        setRecipes(data);
        setSelectedId((prev) => prev ?? data[0]?.id ?? null);
      } catch (e: unknown) {
        if (!mounted) return;
        setLoadError(e instanceof Error ? e.message : "Failed to load recipes.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, []);

  const allTags = useMemo(
    () => uniqueSorted(recipes.flatMap((r) => r.tags)),
    [recipes],
  );
  const allCuisines = useMemo(
    () => uniqueSorted(recipes.map((r) => r.cuisine)),
    [recipes],
  );

  const filteredRecipes = useMemo(() => {
    return recipes.filter((r) => recipeMatches(r, filters));
  }, [recipes, filters]);

  const selectedRecipe = useMemo(() => {
    const id = selectedId ?? filteredRecipes[0]?.id ?? null;
    return filteredRecipes.find((r) => r.id === id) ?? null;
  }, [filteredRecipes, selectedId]);

  useEffect(() => {
    // Keep selection valid when filters change.
    if (!selectedRecipe && filteredRecipes.length > 0) {
      setSelectedId(filteredRecipes[0].id);
    }
    if (filteredRecipes.length === 0) {
      setSelectedId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, recipes]);

  function updateFilter<K extends keyof FilterState>(key: K, value: FilterState[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function clearFilters() {
    setFilters({ query: "", tag: "", cuisine: "", maxMinutes: "" });
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="topbarInner">
          <div className="brand" aria-label="App branding">
            <div className="logoMark" aria-hidden="true" />
            <div>
              <div className="brandTitle">Ocean Recipes</div>
              <div className="brandSub">Browse • Search • Cook</div>
            </div>
          </div>

          <div className="small" aria-label="Runtime info">
            {process.env.NEXT_PUBLIC_NODE_ENV ? (
              <>Env: {process.env.NEXT_PUBLIC_NODE_ENV}</>
            ) : (
              <>Modern recipe explorer</>
            )}
          </div>
        </div>
      </header>

      <main className="container">
        <div className="grid">
          {/* Sidebar */}
          <aside className="card" aria-label="Search and filters">
            <div className="cardHeader">
              <div className="sectionTitle">Search & Filters</div>
            </div>
            <div className="cardBody">
              <div className="field">
                <div className="labelRow">
                  <label className="label" htmlFor="q">
                    Search
                  </label>
                  <span className="hint">Title, tags, ingredients</span>
                </div>
                <input
                  id="q"
                  className="input"
                  value={filters.query}
                  onChange={(e) => updateFilter("query", e.target.value)}
                  placeholder="e.g., salmon, curry, lemon..."
                />
              </div>

              <div className="field">
                <div className="labelRow">
                  <label className="label" htmlFor="tag">
                    Tag
                  </label>
                  <span className="hint">{allTags.length} available</span>
                </div>
                <select
                  id="tag"
                  className="select"
                  value={filters.tag}
                  onChange={(e) => updateFilter("tag", e.target.value)}
                >
                  <option value="">Any</option>
                  {allTags.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <div className="labelRow">
                  <label className="label" htmlFor="cuisine">
                    Cuisine
                  </label>
                  <span className="hint">{allCuisines.length} types</span>
                </div>
                <select
                  id="cuisine"
                  className="select"
                  value={filters.cuisine}
                  onChange={(e) => updateFilter("cuisine", e.target.value)}
                >
                  <option value="">Any</option>
                  {allCuisines.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <div className="labelRow">
                  <label className="label" htmlFor="maxMinutes">
                    Max time (minutes)
                  </label>
                  <span className="hint">Optional</span>
                </div>
                <input
                  id="maxMinutes"
                  className="input"
                  inputMode="numeric"
                  value={filters.maxMinutes}
                  onChange={(e) => updateFilter("maxMinutes", e.target.value)}
                  placeholder="e.g., 20"
                />
              </div>

              <div className="buttonRow">
                <button className="btn btnPrimary" onClick={clearFilters} type="button">
                  Reset
                </button>
                <button
                  className="btn btnGhost"
                  onClick={() => {
                    if (filteredRecipes.length > 0) setSelectedId(filteredRecipes[0].id);
                  }}
                  type="button"
                >
                  First result
                </button>
              </div>

              <div style={{ marginTop: 14 }} className="small">
                Tip: try searching “lemon”, “vegan”, or “breakfast”.
              </div>
            </div>
          </aside>

          {/* Main content */}
          <section className="card" aria-label="Recipes">
            <div className="cardHeader">
              <div className="sectionTitle">Recipes</div>
            </div>

            <div className="cardBody">
              {loading ? (
                <div className="emptyState" aria-live="polite">
                  Loading recipes…
                </div>
              ) : loadError ? (
                <div className="emptyState" role="alert">
                  <div className="errorTitle">Could not load recipes</div>
                  <div className="small mt8">{loadError}</div>
                </div>
              ) : filteredRecipes.length === 0 ? (
                <div className="emptyState" aria-live="polite">
                  No recipes match your filters.
                  <div className="small" style={{ marginTop: 8 }}>
                    Adjust your search, or reset filters.
                  </div>
                </div>
              ) : (
                <>
                  <div className="list" aria-label="Recipe list">
                    {filteredRecipes.map((r) => {
                      const selected = r.id === selectedRecipe?.id;
                      return (
                        <div
                          key={r.id}
                          className={`recipeItem ${selected ? "recipeItemSelected" : ""}`}
                          role="button"
                          tabIndex={0}
                          aria-pressed={selected}
                          onClick={() => setSelectedId(r.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") setSelectedId(r.id);
                          }}
                        >
                          <div className="recipeTitleRow">
                            <div className="recipeTitle">{r.title}</div>
                            <div className="badges" aria-label="Recipe badges">
                              {r.difficulty ? (
                                <span className="badge badgePrimary">{r.difficulty}</span>
                              ) : null}
                              {typeof r.minutes === "number" ? (
                                <span className="badge badgeSecondary">{r.minutes} min</span>
                              ) : null}
                            </div>
                          </div>

                          {r.description ? (
                            <div className="detailSub" style={{ marginTop: 8 }}>
                              {r.description}
                            </div>
                          ) : null}

                          <div className="recipeMeta" aria-label="Recipe metadata">
                            {r.cuisine ? (
                              <span className="kpi">
                                <span className="badge">Cuisine</span> {r.cuisine}
                              </span>
                            ) : null}
                            <span className="kpi">
                              <span className="badge">Tags</span>{" "}
                              {r.tags.length > 0 ? r.tags.join(" • ") : "—"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Detail */}
                  <div style={{ marginTop: 16 }} aria-label="Recipe details">
                    {selectedRecipe ? (
                      <div className="card cardElevated">
                        <div className="cardBody">
                          <div className="detailTitle">{selectedRecipe.title}</div>
                          <div className="detailSub">
                            {selectedRecipe.description || "A delicious recipe—ready when you are."}
                          </div>

                          <div className="buttonRow" aria-label="Quick actions">
                            {selectedRecipe.cuisine ? (
                              <span className="badge badgePrimary">{selectedRecipe.cuisine}</span>
                            ) : null}
                            {typeof selectedRecipe.servings === "number" ? (
                              <span className="badge">Serves {selectedRecipe.servings}</span>
                            ) : null}
                            {typeof selectedRecipe.minutes === "number" ? (
                              <span className="badge badgeSecondary">
                                {selectedRecipe.minutes} minutes
                              </span>
                            ) : null}
                          </div>

                          <div className="detailGrid">
                            <div className="card">
                              <div className="cardHeader">
                                <div className="sectionTitle">Ingredients</div>
                              </div>
                              <div className="cardBody">
                                {selectedRecipe.ingredients.length > 0 ? (
                                  <ul className="ul">
                                    {selectedRecipe.ingredients.map((ing, idx) => (
                                      <li key={`${selectedRecipe.id}-ing-${idx}`}>{ing}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <div className="small">No ingredients listed.</div>
                                )}
                              </div>
                            </div>

                            <div className="card">
                              <div className="cardHeader">
                                <div className="sectionTitle">Steps</div>
                              </div>
                              <div className="cardBody">
                                {selectedRecipe.steps.length > 0 ? (
                                  <ol className="ol">
                                    {selectedRecipe.steps.map((step, idx) => (
                                      <li key={`${selectedRecipe.id}-step-${idx}`}>{step}</li>
                                    ))}
                                  </ol>
                                ) : (
                                  <div className="small">No steps provided.</div>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="small" style={{ marginTop: 14 }}>
                            Data source:{" "}
                            {process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_BACKEND_URL
                              ? "Backend API (if available) with graceful fallback"
                              : "Local fallback dataset"}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="emptyState">Select a recipe to view details.</div>
                    )}
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
