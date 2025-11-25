import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import dbConnect from '../../../../../lib/db';
import Member from '../../../../../models/Member';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  // Debug: log incoming request and member ID
  console.log('🔧 AI analysis endpoint invoked');
  console.log('Params:', params);

  await dbConnect();

  try {
    const { id } = await params;
    const body = await request.json();
    const { type } = body; // 'diet' or 'workout'

    if (!type || !['diet', 'workout'].includes(type)) {
      return NextResponse.json({ success: false, error: 'Invalid or missing generation type' }, { status: 400 });
    }

    console.log('🔎 Analyzing member ID:', id, 'Type:', type);
    const member = await Member.findById(id);

    if (!member) {
      return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
    }

    // Check for API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'GEMINI_API_KEY not found in environment variables. Please add it to .env.local'
      }, { status: 500 });
    }

    // Calculate BMI
    const heightInMeters = member.bodyMeasurements?.height / 100 || 1.7;
    const weight = member.bodyMeasurements?.weight || 70;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);
    const bmiCategory = parseFloat(bmi) < 18.5 ? 'Underweight' :
      parseFloat(bmi) < 25 ? 'Normal' :
        parseFloat(bmi) < 30 ? 'Overweight' : 'Obese';

    // Format preferences
    const dietaryPreferences = Array.isArray(member.dietaryPreferences) && member.dietaryPreferences.length > 0
      ? member.dietaryPreferences.join(', ')
      : 'None';

    let prompt = `Generate a personalized ${type} plan for this member:

    Name: ${member.name}
    Age: ${member.age || 25}, Gender: ${member.gender || 'Male'}
    Height: ${member.bodyMeasurements?.height || 170} cm, Weight: ${member.bodyMeasurements?.weight || 70} kg
    BMI: ${bmi} (${bmiCategory})
    Goals: ${member.goals || 'General fitness'}
    Medical History: ${member.medicalHistory || 'None'}
    Dietary Preferences: ${dietaryPreferences}
    Allergies: ${member.allergies || 'None'}

    IMPORTANT:
    1. If there is any medical history or injury mentioned, modify the plan to accommodate restrictions.
    2. STRICTLY ADHERE to the Dietary Preferences (e.g., if Vegetarian, NO meat/fish/eggs).
    3. STRICTLY AVOID any allergens listed in Allergies.
    4. Include specific notes about modifications and precautions.
`;

    if (type === 'diet') {
      prompt += `
    Create a JSON response with:
    1. A 7 - day Indian diet plan(breakfast, lunch, dinner, mid-morning snack, evening snack for each day) - consider any medical conditions
    2. Include estimated calories for EACH meal
    3. Calculate total daily calories and macros

    Return ONLY valid JSON in this exact format:
    {
      "dietPlan": {
        "breakfast": ["Day 1: ...", ...],
        "lunch": ["Day 1: ...", ...],
        "dinner": ["Day 1: ...", ...],
        "midMorningSnack": ["Day 1: ...", ...],
        "eveningSnack": ["Day 1: ...", ...],
        "calories": 2000,
        "macros": { "protein": 100, "carbs": 250, "fats": 60 },
        "notes": "Include any dietary modifications based on medical history here"
      }
    } `;
    } else {
      prompt += `
    Create a JSON response with:
    1. A 6 - day workout plan(exercises with sets and reps) - avoid exercises that could worsen injuries
    2. Include warmup and cooldown for each day

    Return ONLY valid JSON in this exact format:
    {
      "workoutPlan": {
        "weeklySchedule": [
          {
            "day": "Monday",
            "focus": "Chest",
            "exercises": [{ "name": "Bench Press", "sets": 3, "reps": "8-10", "rest": "90 sec", "notes": "Control the movement" }],
            "duration": 60,
            "warmup": "5 min cardio",
            "cooldown": "5 min stretch"
          }
        ],
        "notes": "Include specific precautions and exercise modifications based on injuries/medical history here"
      }
    } `;
    }

    console.log('📝 Prompt prepared (first 200 chars):', prompt.slice(0, 200));

    // Generate content with Fallback
    let text;
    let usedProvider = 'Gemini';

    try {
      console.log('🤖 Attempting generation with Gemini...');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 15000, // Increased token limit to prevent truncation
          responseMimeType: "application/json",
        }
      });



      const result = await model.generateContent(prompt);
      text = result.response.text();
      console.log('✅ Gemini generation successful');

    } catch (geminiError) {

      console.error('⚠️ Gemini generation failed:', geminiError.message);
      console.log('🔄 Attempting fallback to OpenAI...');

      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        console.error('❌ OPENAI_API_KEY not found in environment variables');
        return NextResponse.json({
          success: false,
          error: 'AI generation failed. Gemini failed and OpenAI key not found.',
          details: geminiError.message
        }, { status: 500 });
      }

      try {
        const openai = new OpenAI({ apiKey: openaiApiKey });
        const completion = await openai.chat.completions.create({
          messages: [
            { role: "system", content: "You are an expert fitness trainer and nutritionist. Output strictly valid JSON." },
            { role: "user", content: prompt }
          ],
          model: "gpt-4o",
          response_format: { type: "json_object" },
          max_tokens: 4096,
        });

        text = completion.choices[0].message.content;
        usedProvider = 'OpenAI';
        console.log('✅ OpenAI generation successful');

      } catch (openaiError) {
        console.error('🚨 OpenAI generation also failed:', openaiError);
        return NextResponse.json({
          success: false,
          error: 'All AI providers failed',
          details: { gemini: geminiError.message, openai: openaiError.message }
        }, { status: 500 });
      }
    }

    if (!text) {
      return NextResponse.json({
        success: false,
        error: 'AI returned empty response',
        provider: usedProvider
      }, { status: 500 });
    }

    console.log(`📝 Parsing response from ${usedProvider} (first 200 chars):`, text.slice(0, 200));

    // Parse JSON response
    let aiData;
    try {
      // Remove markdown code blocks if present (handle various formats)
      let cleanText = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

      // Try to extract JSON object if there's extra text
      const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanText = jsonMatch[0];
      }

      aiData = JSON.parse(cleanText);

      // Validate structure
      if (type === 'diet' && !aiData.dietPlan) throw new Error('Missing dietPlan');
      if (type === 'workout' && !aiData.workoutPlan) throw new Error('Missing workoutPlan');

    } catch (parseError) {
      console.error('Failed to parse AI response:', text.substring(0, 500));
      console.error('Parse error:', parseError.message);
      return NextResponse.json({
        success: false,
        error: `Failed to parse AI response: ${parseError.message}. The response might have been truncated.`,
        rawResponse: text
      }, { status: 500 });
    }

    // Save to database - merge with existing data
    const updateField = type === 'diet' ? 'aiAnalysis.dietPlan' : 'aiAnalysis.workoutPlan';
    const updateData = type === 'diet' ? aiData.dietPlan : aiData.workoutPlan;

    // Add generatedAt timestamp
    updateData.generatedAt = new Date();

    member.aiAnalysis = member.aiAnalysis || {};
    if (type === 'diet') {
      member.aiAnalysis.dietPlan = updateData;
    } else {
      member.aiAnalysis.workoutPlan = updateData;
    }

    // We can use markModified if needed, but direct assignment usually works with Mongoose if structure is defined.
    // However, since aiAnalysis might be a mixed type or nested, let's be safe.
    member.markModified('aiAnalysis');
    await member.save();

    return NextResponse.json({
      success: true,
      data: member.aiAnalysis,
    });

  } catch (error) {
    console.error('AI Analysis error:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
