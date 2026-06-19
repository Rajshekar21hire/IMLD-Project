"""Claude AI-powered agent for generating data stories from air quality data"""
import os

try:
    from anthropic import Anthropic
except ImportError:
    Anthropic = None

class ClaudeAgent:
    """AI agent using Anthropic's Claude for comprehensive data story generation"""

    def __init__(self):
        if Anthropic is None:
            raise RuntimeError(
                "anthropic package is not installed. Install dependencies or leave ANTHROPIC_API_KEY unset to use the rule-based fallback."
            )
        self.client = Anthropic()
        self.model = "claude-3-5-sonnet-20241022"

    def generate_story(self, data_list, country, city, pollution_type, time_period, statistics, trends, aqi_distribution):
        """Generate a comprehensive narrative story from air quality data using Claude"""

        try:
            # Prepare data summary for Claude
            data_summary = self._prepare_data_summary(
                data_list, country, city, pollution_type, time_period, statistics, trends, aqi_distribution
            )

            # Create detailed prompt for Claude
            prompt = f"""You are an expert environmental data analyst and science communicator. Analyze the following air quality data and generate a comprehensive, engaging narrative story.

## Data Context:
{data_summary}

## Required Story Structure:
Generate a story with the following sections:

1. **Executive Summary**: 2-3 sentences summarizing the key findings
2. **Temporal Analysis**: Discuss trends, patterns, and changes over the period
3. **Geographic Context**: Compare this location to other regions if relevant
4. **Health & Risk Assessment**: Specific health implications for this pollution level and location
5. **Key Insights**: 3-4 specific findings from the data
6. **Actionable Recommendations**: Specific solutions tailored to this location

## Tone & Style:
- Professional yet accessible to general audience
- Data-driven with specific numbers from the analysis
- Focused on insights and implications, not just statistics
- Include health recommendations for vulnerable populations
- Suggest concrete actions for improvement

Please generate the story now:"""

            # Call Claude API
            message = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )

            # Parse Claude's response
            story_content = message.content[0].text

            # Extract key insights and recommendations from the content
            key_insights = self._extract_key_insights(story_content, statistics, trends, pollution_type)
            recommendations = self._extract_recommendations(story_content)

            # Generate title
            location = f"{city}, {country}" if city and country else "this region"
            pollutant_name = self._get_pollutant_name(pollution_type)
            title = f"Air Quality Story: {location} - {pollutant_name} Analysis"

            # Create summary
            summary = self._generate_summary(city, country, statistics, pollution_type)

            return {
                'title': title,
                'content': story_content,
                'summary': summary,
                'key_insights': key_insights,
                'recommendations': recommendations
            }

        except Exception as e:
            raise Exception(f"Claude API error: {str(e)}")

    def _prepare_data_summary(self, data_list, country, city, pollution_type, time_period, statistics, trends, aqi_distribution):
        """Prepare comprehensive data summary for Claude"""

        pollutant_name = self._get_pollutant_name(pollution_type)
        location = f"{city}, {country}" if city and country else "this region"

        summary_parts = [
            f"**Location**: {location}",
            f"**Pollutant**: {pollutant_name}",
            f"**Time Period**: {time_period}",
            f"**Data Points**: {len(data_list)} measurements",
            "",
            "**Statistics**:",
            f"- Average: {statistics['avg']:.2f} units" if statistics else "- No statistics available",
            f"- Minimum: {statistics['min']:.2f} units" if statistics else "",
            f"- Maximum: {statistics['max']:.2f} units" if statistics else "",
            "",
        ]

        if aqi_distribution:
            summary_parts.append("**AQI Category Distribution**:")
            total_readings = sum(aqi_distribution.values())
            for category, count in sorted(aqi_distribution.items()):
                percentage = (count / total_readings * 100) if total_readings > 0 else 0
                summary_parts.append(f"- {category}: {count} readings ({percentage:.1f}%)")
            summary_parts.append("")

        if trends:
            sorted_dates = sorted(trends.keys())
            if len(sorted_dates) >= 2:
                first_value = trends[sorted_dates[0]].get(pollution_type)
                last_value = trends[sorted_dates[-1]].get(pollution_type)

                if first_value and last_value:
                    change = last_value - first_value
                    change_pct = (change / first_value * 100) if first_value != 0 else 0
                    direction = "increased" if change > 0 else "decreased"
                    summary_parts.append("**Trend Analysis**:")
                    summary_parts.append(f"- Started at: {first_value:.2f} units")
                    summary_parts.append(f"- Ended at: {last_value:.2f} units")
                    summary_parts.append(f"- Change: {direction} by {abs(change_pct):.1f}%")

        return "\n".join(summary_parts)

    def _get_pollutant_name(self, pollution_type):
        """Get readable name for pollution type"""
        names = {
            'pm25': 'PM2.5 (Fine Particulate Matter)',
            'pm10': 'PM10 (Coarse Particulate Matter)',
            'o3': 'Ozone (O3)',
            'no2': 'Nitrogen Dioxide (NO2)',
            'so2': 'Sulfur Dioxide (SO2)',
            'co': 'Carbon Monoxide (CO)',
            'aqi': 'Air Quality Index (AQI)'
        }
        return names.get(pollution_type, pollution_type)

    def _extract_key_insights(self, story_content, statistics, trends, pollution_type):
        """Extract key insights from Claude's response"""
        insights = []

        if statistics:
            insights.append(f"Average {self._get_pollutant_name(pollution_type)} level: {statistics['avg']:.2f} units")
            insights.append(f"Peak level recorded: {statistics['max']:.2f} units")

        # Look for insights in story content (simple extraction)
        lines = story_content.split('\n')
        for line in lines:
            if 'insight' in line.lower() or 'finding' in line.lower():
                line_clean = line.strip().strip('- *•')
                if len(line_clean) > 20:
                    insights.append(line_clean[:100])
                    if len(insights) >= 4:
                        break

        return insights[:4] if insights else ["Data analysis completed"]

    def _extract_recommendations(self, story_content):
        """Extract recommendations from Claude's response"""
        recommendations = []

        # Look for recommendations in story content
        in_recommendations = False
        lines = story_content.split('\n')

        for line in lines:
            if 'recommendation' in line.lower() or 'action' in line.lower():
                in_recommendations = True
            elif in_recommendations and (line.startswith('-') or line.startswith('•')):
                rec = line.strip().strip('-•').strip()
                if rec and len(rec) > 10:
                    recommendations.append(rec)
                    if len(recommendations) >= 5:
                        break

        # If no recommendations found, add generic ones
        if not recommendations:
            recommendations = [
                "Monitor air quality regularly",
                "Implement pollution control measures",
                "Promote public awareness",
                "Support sustainable transportation",
                "Invest in renewable energy"
            ]

        return recommendations[:5]

    def _generate_summary(self, city, country, statistics, pollution_type):
        """Generate a brief summary of the analysis"""
        location = f"{city}, {country}" if city and country else "this region"

        if not statistics:
            return f"Air quality analysis for {location}."

        pollutant_name = self._get_pollutant_name(pollution_type)
        status = "GOOD" if statistics['avg'] < 50 else "MODERATE" if statistics['avg'] < 100 else "POOR"

        return f"Analysis of {pollutant_name} levels in {location} reveals {status.lower()} air quality conditions with an average level of {statistics['avg']:.2f} units."
