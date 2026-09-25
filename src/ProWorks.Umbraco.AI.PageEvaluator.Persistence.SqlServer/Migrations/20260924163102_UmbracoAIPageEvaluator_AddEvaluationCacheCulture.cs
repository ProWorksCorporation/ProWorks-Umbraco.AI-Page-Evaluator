using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class UmbracoAIPageEvaluator_AddEvaluationCacheCulture : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_umbracoAIEvaluationCache",
                table: "umbracoAIEvaluationCache");

            migrationBuilder.AddColumn<string>(
                name: "Culture",
                table: "umbracoAIEvaluationCache",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddPrimaryKey(
                name: "PK_umbracoAIEvaluationCache",
                table: "umbracoAIEvaluationCache",
                columns: new[] { "NodeId", "Culture" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "PK_umbracoAIEvaluationCache",
                table: "umbracoAIEvaluationCache");

            migrationBuilder.DropColumn(
                name: "Culture",
                table: "umbracoAIEvaluationCache");

            migrationBuilder.AddPrimaryKey(
                name: "PK_umbracoAIEvaluationCache",
                table: "umbracoAIEvaluationCache",
                column: "NodeId");
        }
    }
}
