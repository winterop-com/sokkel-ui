#!/usr/bin/env bash
# The screenshot baselines live on branches of their own, never in the code's tree:
#   baselines               main's baselines: one commit, no history, the PNGs at its root
#   baselines-for/<branch>  a code branch's baselines: one commit on top of `baselines` that holds
#                           what the branch changed
# A branch's baselines are the current `baselines` with its own commit's changes laid over them,
# so a branch retaken before another merged still sees the other's baselines.
#   scripts/baselines.sh checkout [branch] [dir]  write the branch's baselines into dir
#   scripts/baselines.sh commit [branch] [dir]    push dir as the branch's baselines
#   scripts/baselines.sh promote <branch>         lay the branch's changes onto `baselines`, then
#                                                 delete its baselines branch
# branch defaults to the current one (main when detached), and dir to e2e/__screenshots__.
set -euo pipefail

main_ref=baselines
remote=origin

own_ref() { echo "baselines-for/$1"; }
tracking() { echo "refs/remotes/$remote/$1"; }

# Fetches a baselines branch into its remote-tracking ref; fails when it does not exist.
fetch() {
    if ! git ls-remote --exit-code --heads "$remote" "refs/heads/$1" >/dev/null; then
        git update-ref -d "$(tracking "$1")" 2>/dev/null || true
        return 1
    fi
    git fetch --quiet --no-tags "$remote" "+refs/heads/$1:$(tracking "$1")"
}

# Prints the tree of `baselines` with the changes of the given commit (on top of an older
# `baselines`) laid over it.
overlay() {
    local base=$1 commit=$2 index meta path mode sha status
    index=$(mktemp -u)
    GIT_INDEX_FILE=$index git read-tree "$base"
    git diff-tree -r -z --no-renames "$commit^" "$commit" | while IFS= read -r -d '' meta && IFS= read -r -d '' path; do
        # meta is ":oldmode newmode oldsha newsha status".
        read -r _ mode _ sha status <<<"$meta"
        if [ "$status" = D ]; then
            GIT_INDEX_FILE=$index git update-index --force-remove -- "$path"
        else
            GIT_INDEX_FILE=$index git update-index --add --cacheinfo "$mode,$sha,$path"
        fi
    done
    GIT_INDEX_FILE=$index git write-tree
    rm -f "$index"
}

# Prints the tree of the given code branch's baselines.
tree_of() {
    local branch=$1 base
    fetch "$main_ref" || {
        echo "There is no $main_ref branch on $remote." >&2
        exit 1
    }
    base=$(git rev-parse "$(tracking "$main_ref")^{tree}")
    if [ "$branch" != main ] && fetch "$(own_ref "$branch")"; then
        overlay "$base" "$(tracking "$(own_ref "$branch")")"
    else
        echo "$base"
    fi
}

# Moves a remote branch to a commit, or deletes it when the commit is empty, failing if the branch
# moved since it was last fetched.
publish() {
    local branch=$1 commit=$2 old=''
    git rev-parse --verify --quiet "$(tracking "$branch")" >/dev/null && old=$(git rev-parse "$(tracking "$branch")")
    git push --quiet --force-with-lease="refs/heads/$branch:$old" "$remote" "$commit:refs/heads/$branch"
}

command=${1:-}
branch=${2:-$(git branch --show-current)}
branch=${branch:-main}
dir=${3:-e2e/__screenshots__}

case $command in
    checkout)
        tree=$(tree_of "$branch")
        rm -rf "$dir"
        mkdir -p "$dir"
        git archive "$tree" | tar -x -C "$dir"
        echo "Wrote the baselines of $branch into $dir."
        ;;
    commit)
        index=$(mktemp -u)
        gitdir=$(git rev-parse --absolute-git-dir)
        (cd "$dir" && GIT_INDEX_FILE=$index GIT_DIR=$gitdir GIT_WORK_TREE=. git add --all --force .)
        tree=$(GIT_INDEX_FILE=$index git write-tree)
        rm -f "$index"
        base=$(tracking "$main_ref")
        if [ "$branch" = main ] && ! fetch "$main_ref"; then
            publish "$main_ref" "$(git commit-tree "$tree" -m 'test: the screenshot baselines')"
            echo "Created $main_ref."
            exit 0
        fi
        tree_of "$branch" >/dev/null
        if [ "$branch" = main ]; then
            if [ "$tree" = "$(git rev-parse "$base^{tree}")" ]; then
                echo 'The baselines are unchanged.'
            else
                publish "$main_ref" "$(git commit-tree "$tree" -m 'test: the screenshot baselines')"
                echo "Pushed the baselines to $main_ref."
            fi
        else
            own=$(own_ref "$branch")
            if [ "$tree" = "$(git rev-parse "$base^{tree}")" ]; then
                # The branch's baselines are main's; a branch of its own would hold nothing.
                if git ls-remote --exit-code --heads "$remote" "refs/heads/$own" >/dev/null; then
                    publish "$own" ''
                    echo "The baselines match $main_ref; deleted $own."
                else
                    echo "The baselines match $main_ref."
                fi
            elif git rev-parse --verify --quiet "$(tracking "$own")" >/dev/null &&
                [ "$tree" = "$(git rev-parse "$(tracking "$own")^{tree}")" ] &&
                [ "$(git rev-parse "$(tracking "$own")^")" = "$(git rev-parse "$base")" ]; then
                echo 'The baselines are unchanged.'
            else
                publish "$own" "$(git commit-tree "$tree" -p "$base" -m "test: the screenshot baselines of $branch")"
                echo "Pushed the baselines to $own."
            fi
        fi
        ;;
    promote)
        own=$(own_ref "$branch")
        if ! fetch "$own"; then
            echo "$branch has no baselines of its own."
            exit 0
        fi
        tree=$(tree_of "$branch")
        if [ "$tree" != "$(git rev-parse "$(tracking "$main_ref")^{tree}")" ]; then
            publish "$main_ref" "$(git commit-tree "$tree" -m "test: the screenshot baselines, with those of $branch")"
            echo "Laid the baselines of $branch onto $main_ref."
        fi
        publish "$own" ''
        echo "Deleted $own."
        ;;
    *)
        sed -n '2,12p' "$0" >&2
        exit 2
        ;;
esac
