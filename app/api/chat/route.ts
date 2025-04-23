import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const body = await request.json();
    console.log('Received request body:', body);

    if (!body.messages || !Array.isArray(body.messages)) {
      return NextResponse.json(
        { error: 'Invalid request format: messages array is required' },
        { status: 400 }
      );
    }

    // OpenAI API 호출
    console.log('Calling OpenAI API with messages:', body.messages);
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `당신은 장소 검색 도우미입니다. 사용자의 입력에서 검색에 필요한 정보를 추출하여 다음 JSON 형식으로 반환하세요:
          {
            "searchTerms": ["카페", "레스토랑"],  // 검색할 장소 유형
            "location": "홍대",                   // 검색할 지역
            "requirements": ["조용한", "24시간"]   // 특별 요구사항
          }
          
          예시 1:
          입력: "홍대 근처 조용한 카페 추천해줘"
          출력: {
            "searchTerms": ["카페"],
            "location": "홍대",
            "requirements": ["조용한"]
          }
          
          예시 2:
          입력: "강남역 24시간 식당 찾아줘"
          출력: {
            "searchTerms": ["식당", "레스토랑"],
            "location": "강남역",
            "requirements": ["24시간"]
          }`
        },
        ...body.messages
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    });

    console.log('OpenAI API response:', completion.choices[0].message);

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json(
        { error: 'Empty response from OpenAI' },
        { status: 500 }
      );
    }

    try {
      const parsedContent = JSON.parse(content);
      console.log('Parsed content:', parsedContent);

      // 응답 데이터 검증
      if (!parsedContent.searchTerms || !parsedContent.location) {
        return NextResponse.json(
          { error: 'Invalid response format from OpenAI' },
          { status: 500 }
        );
      }

      // 기본값 설정
      const response = {
        searchTerms: Array.isArray(parsedContent.searchTerms) ? parsedContent.searchTerms : [parsedContent.searchTerms],
        location: parsedContent.location,
        requirements: Array.isArray(parsedContent.requirements) ? parsedContent.requirements : []
      };

      console.log('Final response:', response);
      return NextResponse.json(response);
    } catch (parseError) {
      console.error('Failed to parse ChatGPT response:', content);
      return NextResponse.json(
        { error: 'Failed to parse ChatGPT response', details: content },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process the request', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 