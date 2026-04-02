using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class UmbracoAIPageEvaluator_InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "umbracoAIEvaluatorConfig",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    Description = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    DocumentTypeAlias = table.Column<string>(type: "TEXT", maxLength: 255, nullable: false),
                    ProfileId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ContextId = table.Column<Guid>(type: "TEXT", nullable: true),
                    PromptText = table.Column<string>(type: "TEXT", nullable: false),
                    IsActive = table.Column<bool>(type: "INTEGER", nullable: false),
                    DateCreated = table.Column<DateTime>(type: "TEXT", nullable: false),
                    DateModified = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CreatedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    ModifiedByUserId = table.Column<Guid>(type: "TEXT", nullable: true),
                    Version = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_umbracoAIEvaluatorConfig", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_umbracoAIEvaluatorConfig_DocumentTypeAlias_IsActive",
                table: "umbracoAIEvaluatorConfig",
                columns: new[] { "DocumentTypeAlias", "IsActive" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "umbracoAIEvaluatorConfig");
        }
    }
}
