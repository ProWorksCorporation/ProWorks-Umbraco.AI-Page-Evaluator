using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.Sqlite.Migrations
{
    /// <inheritdoc />
    public partial class UmbracoAIPageEvaluator_AddPropertyAliases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PropertyAliases",
                table: "umbracoAIEvaluatorConfig",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PropertyAliases",
                table: "umbracoAIEvaluatorConfig");
        }
    }
}
