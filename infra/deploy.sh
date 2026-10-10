#!/usr/bin/env bash
# Build the Lambda package, deploy the CloudFormation stack, upload flood layers.
# Usage: infra/deploy.sh   (needs AWS CLI credentials; run backend/prep first so backend/data/out exists)
set -euo pipefail

REGION="${KOSI_REGION:-us-east-1}"
STACK=kosi-twin
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BUILD="$ROOT/infra/.build"
OUT="$ROOT/backend/data/out"
ACCOUNT="$(aws sts get-caller-identity --query Account --output text)"
CODE_BUCKET="kosi-twin-deploy-$ACCOUNT"

echo "==> packaging Lambda"
rm -rf "$BUILD" && mkdir -p "$BUILD/pkg/model"
pip install --quiet --target "$BUILD/pkg" --platform manylinux2014_x86_64 --python-version 3.13 \
    --implementation cp --only-binary=:all: -r "$ROOT/backend/requirements.txt"
cp -r "$ROOT/backend/kosi" "$BUILD/pkg/"
cp "$OUT"/{villages,shelters,stage_stats,grid,river_profile}.json "$OUT/roads.npz" "$BUILD/pkg/model/"
find "$BUILD/pkg" -name "__pycache__" -type d -prune -exec rm -rf {} +
(cd "$BUILD/pkg" && python -c "import shutil; shutil.make_archive('../lambda', 'zip', '.')")
HASH="$(sha1sum "$BUILD/lambda.zip" | cut -c1-12)"
echo "    lambda.zip $(du -h "$BUILD/lambda.zip" | cut -f1), unzipped $(du -sh "$BUILD/pkg" | cut -f1)"

echo "==> uploading code to s3://$CODE_BUCKET"
aws s3api head-bucket --bucket "$CODE_BUCKET" 2>/dev/null || aws s3 mb "s3://$CODE_BUCKET" --region "$REGION"
aws s3 cp "$BUILD/lambda.zip" "s3://$CODE_BUCKET/lambda-$HASH.zip" --region "$REGION" --only-show-errors

echo "==> deploying stack $STACK"
aws cloudformation deploy --region "$REGION" --stack-name "$STACK" --template-file "$ROOT/infra/template.yaml" \
    --capabilities CAPABILITY_IAM --no-fail-on-empty-changeset \
    --parameter-overrides CodeBucket="$CODE_BUCKET" CodeKey="lambda-$HASH.zip"

output() { aws cloudformation describe-stacks --region "$REGION" --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text; }

echo "==> uploading flood layers"
aws s3 sync "$OUT/layers" "s3://$(output SiteBucket)/layers" --region "$REGION" --only-show-errors \
    --cache-control "public, max-age=86400"

echo "==> building and uploading the web app"
(cd "$ROOT/frontend" && { [ -d node_modules ] || npm ci --silent; } && npm run build --silent)
aws s3 sync "$ROOT/frontend/dist" "s3://$(output SiteBucket)" --region "$REGION" --only-show-errors     --delete --exclude "layers/*" --exclude "audio/*"
MSYS_NO_PATHCONV=1 aws cloudfront create-invalidation --distribution-id "$(output DistributionId)" --paths "/index.html" "/"     --query "Invalidation.Id" --output text >/dev/null

echo
echo "Site:   $(output Url)"
echo "API:    $(output ApiUrl)/api/health"
