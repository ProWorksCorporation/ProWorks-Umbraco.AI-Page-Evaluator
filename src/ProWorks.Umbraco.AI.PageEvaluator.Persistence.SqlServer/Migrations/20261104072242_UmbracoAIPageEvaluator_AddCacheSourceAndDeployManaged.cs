using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProWorks.Umbraco.AI.PageEvaluator.Persistence.SqlServer.Migrations
{
    /// <inheritdoc />
    public partial class UmbracoAIPageEvaluator_AddCacheSourceAndDeployManaged : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsDeployManaged",
                table: "umbracoAIEvaluatorConfig",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTime>(
                name: "SourceUpdateDate",
                table: "umbracoAIEvaluationCache",
                type: "datetime2",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsDeployManaged",
                table: "umbracoAIEvaluatorConfig");

            migrationBuilder.DropColumn(
                name: "SourceUpdateDate",
                table: "umbracoAIEvaluationCache");
        }
    }
}
