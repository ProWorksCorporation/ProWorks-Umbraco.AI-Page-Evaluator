using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class UmbracoAIPageEvaluator_AddEvaluationCache : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "umbracoAIEvaluationCache",
                columns: table => new
                {
                    NodeId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    DocumentTypeAlias = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    ReportJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CachedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_umbracoAIEvaluationCache", x => x.NodeId);
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "umbracoAIEvaluationCache");
        }
    }
}
