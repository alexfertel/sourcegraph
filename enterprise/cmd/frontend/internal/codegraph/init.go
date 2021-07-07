package codegraph

import (
	"context"

	"github.com/sourcegraph/sourcegraph/cmd/frontend/enterprise"
	"github.com/sourcegraph/sourcegraph/enterprise/cmd/frontend/internal/codegraph/resolvers"
	codeintelresolvers "github.com/sourcegraph/sourcegraph/enterprise/cmd/frontend/internal/codeintel/resolvers"
	"github.com/sourcegraph/sourcegraph/internal/database/dbutil"
	"github.com/sourcegraph/sourcegraph/internal/oobmigration"
	"github.com/sourcegraph/sourcegraph/internal/timeutil"
)

func Init(ctx context.Context, db dbutil.DB, outOfBandMigrationRunner *oobmigration.Runner, enterpriseServices *enterprise.Services) error {
	enterpriseServices.CodeGraphResolver = resolvers.NewResolver(
		db,
		func() codeintelresolvers.Resolver {
			return enterpriseServices.CodeIntelResolver.(interface {
				InnerResolver() codeintelresolvers.Resolver
			}).InnerResolver()
		},
		timeutil.Now,
	)
	return nil
}